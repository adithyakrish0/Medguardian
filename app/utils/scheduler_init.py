"""
Scheduler integration for MedGuardian
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
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
    
    # Add missed dose checking job
    interval_seconds = int(os.getenv('MISSED_DOSE_CHECK_INTERVAL', 3600))
    
    with app.app_context():
        from app.utils.scheduler import check_missed_doses
        
        scheduler.add_job(
            func=lambda: check_missed_doses_with_context(app),
            trigger=IntervalTrigger(seconds=interval_seconds),
            id='missed_dose_checker',
            name='Check for missed medication doses',
            replace_existing=True
        )
    
    scheduler.start()
    logger.info(f"Scheduler started - checking missed doses every {interval_seconds} seconds")
    
    return scheduler

def check_missed_doses_with_context(app):
    """Wrapper to run check_missed_doses with app context"""
    with app.app_context():
        from app.utils.scheduler import check_missed_doses
        check_missed_doses()
