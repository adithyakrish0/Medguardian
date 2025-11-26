"""
Scheduled task for checking missed doses and sending notifications
"""
from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.utils.notifications import notification_service
import logging

logger = logging.getLogger(__name__)

def check_missed_doses():
    """
    Check for missed medication doses and send notifications
    This function should be called periodically (e.g., every hour)
    """
    from app.extensions import db
    
    now = datetime.now()
    one_hour_ago = now - timedelta(hours=1)
    
    # Get all medications
    medications = Medication.query.all()
    
    for med in medications:
        # Get scheduled times for this medication
        scheduled_times = get_scheduled_times(med, now.date())
        
        for scheduled_time in scheduled_times:
            # Check if this time has passed and is within the last hour
            if one_hour_ago < scheduled_time < now:
                # Check if medication was taken
                log = MedicationLog.query.filter_by(
                    medication_id=med.id,
                    user_id=med.user_id
                ).filter(
                    MedicationLog.taken_at >= scheduled_time - timedelta(minutes=30),
                    MedicationLog.taken_at <= scheduled_time + timedelta(minutes=30)
                ).first()
                
                if not log:
                    # Medication was missed!
                    logger.warning(f"Missed dose detected: {med.name} for user {med.user_id}")
                    
                    # Notify user
                    if med.user.email:
                        notification_service.send_missed_dose_alert(
                            med.user.email,
                            med.name,
                            scheduled_time.strftime('%I:%M %p')
                        )
                    
                    # Notify caregivers
                    caregivers = CaregiverSenior.query.filter_by(
                        senior_id=med.user_id
                    ).all()
                    
                    for relationship in caregivers:
                        if relationship.caregiver.email:
                            notification_service.send_caregiver_alert(
                                relationship.caregiver.email,
                                med.user.username,
                                'missed_dose',
                                f"{med.name} at {scheduled_time.strftime('%I:%M %p')}"
                            )

def get_scheduled_times(medication, date):
    """
    Get all scheduled times for a medication on a given date
    
    Args:
        medication: Medication object
        date: date object
        
    Returns:
        List of datetime objects
    """
    import json
    scheduled_times = []
    
    # Check custom times first
    if medication.custom_reminder_times:
        try:
            custom_times = json.loads(medication.custom_reminder_times)
            for time_str in custom_times:
                hour, minute = map(int, time_str.split(':'))
                dt = datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
                scheduled_times.append(dt)
        except:
            pass
    
    # Check period-based schedule
    if medication.morning:
        scheduled_times.append(datetime.combine(date, datetime.min.time().replace(hour=8, minute=0)))
    if medication.afternoon:
        scheduled_times.append(datetime.combine(date, datetime.min.time().replace(hour=14, minute=0)))
    if medication.evening:
        scheduled_times.append(datetime.combine(date, datetime.min.time().replace(hour=18, minute=0)))
    if medication.night:
        scheduled_times.append(datetime.combine(date, datetime.min.time().replace(hour=21, minute=0)))
    
    return scheduled_times
