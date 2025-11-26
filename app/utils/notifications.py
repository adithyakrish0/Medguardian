"""
Email and notification utilities for MedGuardian
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class NotificationService:
    """Simple notification service for missed doses and alerts"""
    
    def __init__(self):
        self.notifications_log = []
    
    def send_missed_dose_alert(self, user_email, medication_name, scheduled_time):
        """Send alert for missed medication dose"""
        message = {
            'timestamp': datetime.now(),
            'type': 'missed_dose',
            'recipient': user_email,
            'medication': medication_name,
            'scheduled_time': scheduled_time,
            'message': f"ALERT: Missed dose of {medication_name} scheduled for {scheduled_time}"
        }
        
        # Log the notification
        self.notifications_log.append(message)
        logger.warning(f"Missed dose alert: {message['message']}")
        
        # Send real email
        try:
            from app.utils.email_service import send_missed_dose_email
            send_missed_dose_email(user_email, medication_name, scheduled_time)
            logger.info(f"Email sent to {user_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            # Fallback to console
            print(f"\n{'='*60}")
            print(f"📧 NOTIFICATION (EMAIL FAILED - printed instead)")
            print(f"{'='*60}")
            print(f"To: {user_email}")
            print(f"Subject: Missed Medication Alert - {medication_name}")
            print(f"Time: {scheduled_time}")
            print(f"{'='*60}\n")
        
        return True
    
    def send_caregiver_alert(self, caregiver_email, senior_name, alert_type, details):
        """Send alert to caregiver"""
        message = {
            'timestamp': datetime.now(),
            'type': f'caregiver_{alert_type}',
            'recipient': caregiver_email,
            'senior': senior_name,
            'details': details,
            'message': f"Alert for {senior_name}: {alert_type}"
        }
        
        self.notifications_log.append(message)
        logger.info(f"Caregiver alert: {message['message']}")
        
        # Send real email
        try:
            from app.utils.email_service import send_caregiver_alert_email
            send_caregiver_alert_email(caregiver_email, senior_name, alert_type, details)
            logger.info(f"Email sent to {caregiver_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            # Fallback to console
            print(f"\n{'='*60}")
            print(f"👨‍⚕️ CAREGIVER ALERT (EMAIL FAILED - printed instead)")
            print(f"{'='*60}")
            print(f"To: {caregiver_email}")
            print(f"Senior: {senior_name}")
            print(f"Alert Type: {alert_type}")
            print(f"Details: {details}")
            print(f"{'='*60}\n")
        
        return True
    
    def get_notification_history(self, limit=10):
        """Get recent notification history"""
        return self.notifications_log[-limit:]

# Global notification service instance
notification_service = NotificationService()
