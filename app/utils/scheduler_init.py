"""
Scheduler integration for MedGuardian
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import os
import logging

logger = logging.getLogger(__name__)

scheduler = None

def init_scheduler(app):
    """Initialize the background scheduler"""
    global scheduler
    
    if scheduler is not None:
        return scheduler
    
    scheduler = BackgroundScheduler()
    
    with app.app_context():
        from app.utils.scheduler import check_missed_doses, send_realtime_reminders
        
        # Job 1: Check missed doses every hour
        interval_seconds = int(os.getenv('MISSED_DOSE_CHECK_INTERVAL', 3600))
        scheduler.add_job(
            func=lambda: check_missed_doses_with_context(app),
            trigger=IntervalTrigger(seconds=interval_seconds),
            id='missed_dose_checker',
            name='Check for missed medication doses',
            replace_existing=True
        )
        
        # Job 2: Send real-time reminders every minute
        scheduler.add_job(
            func=lambda: send_realtime_reminders_with_context(app),
            trigger=IntervalTrigger(seconds=60),
            id='realtime_reminder',
            name='Send real-time medication reminders',
            replace_existing=True
        )
        
        # Job 3: Send weekly reports every Sunday at 9 AM
        scheduler.add_job(
            func=lambda: send_weekly_reports_with_context(app),
            trigger=CronTrigger(day_of_week='sun', hour=9, minute=0),
            id='weekly_reports',
            name='Send weekly compliance reports to caregivers',
            replace_existing=True
        )
        
        # Job 4: Run anomaly detection at 2 AM daily
        scheduler.add_job(
            func=lambda: run_anomaly_detection_with_context(app),
            trigger=CronTrigger(hour=2, minute=0),
            id='nightly_anomaly_detection',
            name='Nightly adherence anomaly detection',
            replace_existing=True
        )
        
        # Job 5: Run refill checks at 3 AM daily
        scheduler.add_job(
            func=lambda: run_refill_checks_with_context(app),
            trigger=CronTrigger(hour=3, minute=0),
            id='nightly_refill_check',
            name='Nightly refill prediction and alerts',
            replace_existing=True
        )
    
    scheduler.start()
    logger.info(f"Scheduler started - checking missed doses every {interval_seconds} seconds")
    logger.info("Scheduler started - sending real-time reminders every 60 seconds")
    logger.info("Scheduler started - weekly reports every Sunday at 9 AM")
    logger.info("Scheduler started - nightly anomaly detection at 2 AM")
    logger.info("Scheduler started - nightly refill check at 3 AM")
    
    # Run missed dose check after a short delay to avoid blocking server startup
    # Using a thread to ensure socketio.run() can start immediately
    import threading
    def delayed_initial_check():
        import time
        time.sleep(5)  # Wait 5 seconds for server to fully start
        try:
            check_missed_doses_with_context(app)
            logger.info("Initial missed dose check completed")
        except Exception as e:
            logger.error(f"Initial missed dose check failed: {e}")
        finally:
            with app.app_context():
                from app.extensions import db
                db.session.remove()
    
    thread = threading.Thread(target=delayed_initial_check, daemon=True)
    thread.start()
    
    return scheduler

def check_missed_doses_with_context(app):
    """Wrapper to run check_missed_doses with app context"""
    with app.app_context():
        try:
            from app.utils.scheduler import check_missed_doses
            check_missed_doses()
        finally:
            from app.extensions import db
            db.session.remove()

def send_realtime_reminders_with_context(app):
    """Wrapper to run send_realtime_reminders with app context"""
    with app.app_context():
        from app.extensions import db
        try:
            # CRITICAL: Clear ALL cached objects to see latest database state
            # This prevents the scheduler from using stale medication/log data
            db.session.expire_all()  # Expire cached objects
            db.session.remove()      # Remove old session
            
            from app.utils.scheduler import send_realtime_reminders
            send_realtime_reminders()
        finally:
            db.session.remove()

def send_weekly_reports_with_context(app):
    """Wrapper to send weekly reports with app context"""
    with app.app_context():
        from app.extensions import db
        try:
            from app.services.weekly_report import send_weekly_reports
            
            db.session.expire_all()
            db.session.remove()
            
            count = send_weekly_reports()
            logger.info(f"Weekly reports sent to {count} caregivers")
        finally:
            db.session.remove()


def run_anomaly_detection_with_context(app):
    """Wrapper to run nightly anomaly detection with app context"""
    with app.app_context():
        from app.extensions import db, socketio
        try:
            from app.ml.anomaly_detector import anomaly_detector
            from app.models.medication_log import MedicationLog
            from app.models.relationship import CaregiverSenior
            from datetime import datetime, timedelta
            
            db.session.expire_all()
            db.session.remove()
            
            def get_logs_for_patient(patient_id):
                """Fetch recent logs for a patient."""
                cutoff = datetime.utcnow() - timedelta(days=7)
                logs = MedicationLog.query.filter(
                    MedicationLog.user_id == patient_id,
                    MedicationLog.taken_at >= cutoff
                ).order_by(MedicationLog.taken_at.asc()).all()
                return [log.to_dict() for log in logs]
            
            results = anomaly_detector.detect_for_all_patients(get_logs_for_patient)
            
            # Send alerts for detected anomalies
            alerts_sent = 0
            for result in results:
                patient_id = result.details.get('baseline', {}).get('patient_id')
                if patient_id and result.is_anomaly:
                    relationships = CaregiverSenior.query.filter_by(
                        senior_id=patient_id,
                        status='accepted'
                    ).all()
                    
                    for rel in relationships:
                        socketio.emit(
                            'anomaly_alert',
                            result.to_dict(),
                            room=f'user_{rel.caregiver_id}'
                        )
                        alerts_sent += 1
            
            anomalies_found = sum(1 for r in results if r.is_anomaly)
            logger.info(f"Nightly anomaly detection: {anomalies_found} anomalies found, {alerts_sent} alerts sent")
            
        except Exception as e:
            logger.error(f"Nightly anomaly detection failed: {e}", exc_info=True)
        finally:
            db.session.remove()


def run_refill_checks_with_context(app):
    """Wrapper to run nightly refill checks with app context"""
    with app.app_context():
        from app.extensions import db, socketio
        try:
            from app.ml.refill_predictor import refill_predictor
            from app.models.user import User
            from app.models.relationship import CaregiverSenior
            
            db.session.expire_all()
            db.session.remove()
            
            # Get all senior patients
            seniors = User.query.filter_by(role='senior').all()
            
            total_alerts = 0
            for senior in seniors:
                try:
                    created_alerts = refill_predictor.check_and_create_alerts(senior.id)
                    
                    # Send Socket.IO alerts to caregivers
                    if created_alerts:
                        relationships = CaregiverSenior.query.filter_by(
                            senior_id=senior.id,
                            status='accepted'
                        ).all()
                        
                        for rel in relationships:
                            socketio.emit(
                                'refill_alert',
                                {
                                    'patient_id': senior.id,
                                    'alerts': created_alerts
                                },
                                room=f'user_{rel.caregiver_id}'
                            )
                        total_alerts += len(created_alerts)
                except Exception as e:
                    logger.error(f"Refill check failed for patient {senior.id}: {e}")
            
            logger.info(f"Nightly refill check: {len(seniors)} patients checked, {total_alerts} alerts created")
            
        except Exception as e:
            logger.error(f"Nightly refill check failed: {e}", exc_info=True)
        finally:
            db.session.remove()
