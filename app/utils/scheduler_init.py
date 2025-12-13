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
    
    scheduler.start()
    logger.info(f"Scheduler started - checking missed doses every {interval_seconds} seconds")
    logger.info("Scheduler started - sending real-time reminders every 60 seconds")
    logger.info("Scheduler started - weekly reports every Sunday at 9 AM")
    
    return scheduler

def check_missed_doses_with_context(app):
    """Wrapper to run check_missed_doses with app context"""
    with app.app_context():
        from app.utils.scheduler import check_missed_doses
        check_missed_doses()

def send_realtime_reminders_with_context(app):
    """Wrapper to run send_realtime_reminders with app context"""
    with app.app_context():
        from app.extensions import db
        
        # CRITICAL: Clear ALL cached objects to see latest database state
        # This prevents the scheduler from using stale medication/log data
        db.session.expire_all()  # Expire cached objects
        db.session.remove()      # Remove old session
        
        from app.utils.scheduler import send_realtime_reminders
        send_realtime_reminders()

def send_weekly_reports_with_context(app):
    """Wrapper to send weekly reports with app context"""
    with app.app_context():
        from app.services.weekly_report import send_weekly_reports
        from app.extensions import db
        
        db.session.expire_all()
        db.session.remove()
        
        count = send_weekly_reports()
        logger.info(f"Weekly reports sent to {count} caregivers")

