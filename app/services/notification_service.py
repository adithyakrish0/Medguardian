"""Notification service - Unified notification system"""
from typing import List, Optional, Dict
from flask import current_app
from flask_mail import Mail, Message
from flask_socketio import SocketIO, emit
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Unified notification service for email, SocketIO, and other channels"""
    
    def __init__(self, app=None, socketio: Optional[SocketIO] = None, mail: Optional[Mail] = None):
        self.app = app
        self.socketio = socketio
        self.mail = mail
        
        if app:
            self.init_app(app, socketio, mail)
    
    def init_app(self, app, socketio: Optional[SocketIO] = None, mail: Optional[Mail] = None):
        """Initialize with Flask app"""
        self.app = app
        self.socketio = socketio
        self.mail = mail
    
    def send_email(self, to: str, subject: str, body: str, html: Optional[str] = None) -> bool:
        """Send email notification"""
        if not self.mail:
            logger.warning("Mail not configured, email not sent")
            return False
        
        try:
            msg = Message(
                subject=subject,
                recipients=[to] if isinstance(to, str) else to,
                body=body,
                html=html
            )
            
            self.mail.send(msg)
            logger.info(f"Email sent to {to}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_socketio_event(self, event: str, data: Dict, room: Optional[str] = None, 
                           namespace: str = '/') -> bool:
        """Send SocketIO real-time notification"""
        if not self.socketio:
            logger.warning("SocketIO not configured, event not sent")
            return False
        
        try:
            if room:
                self.socketio.emit(event, data, room=room, namespace=namespace)
            else:
                self.socketio.emit(event, data, namespace=namespace)
            
            logger.info(f"SocketIO event sent: {event}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SocketIO event: {e}")
            return False
    
    def send_medication_reminder(self, user_id: int, medication: Dict, 
                                 user_email: Optional[str] = None) -> bool:
        """Send medication reminder via multiple channels"""
        success = True
        
        # Send SocketIO notification for real-time alert
        socketio_data = {
            'type': 'medication_reminder',
            'medication': medication,
            'timestamp': medication.get('time', 'now')
        }
        
        if not self.send_socketio_event('medication_reminder', socketio_data, room=str(user_id)):
            success = False
        
        # Send email if provided
        if user_email:
            subject = f"Medication Reminder: {medication['name']}"
            body = f"""
            Time to take your medication:
            
            Medication: {medication['name']}
            Dosage: {medication['dosage']}
            Instructions: {medication.get('instructions', 'No special instructions')}
            
            Please take your medication as prescribed.
            
            - MedGuardian
            """
            
            if not self.send_email(user_email, subject, body):
                success = False
        
        return success
    
    def send_caregiver_alert(self, caregiver_emails: List[str], senior_name: str, 
                            medication_name: str, alert_type: str = 'missed') -> bool:
        """Send alert to caregivers about medication issues"""
        if not caregiver_emails:
            return False
            
        from app.utils.email_service import send_caregiver_alert_email
        success = True
        for email in caregiver_emails:
            if not send_caregiver_alert_email(email, senior_name, alert_type, f"Medication: {medication_name}"):
                success = False
        return success
    
    def send_browser_notification(self, user_id: int, title: str, body: str, 
                                  icon: Optional[str] = None) -> bool:
        """Send browser push notification via SocketIO"""
        notification_data = {
            'type': 'browser_notification',
            'title': title,
            'body': body,
            'icon': icon or '/static/images/pill-icon.png'
        }
        
        return self.send_socketio_event('browser_notification', notification_data, room=str(user_id))


# Global notification service instance
notification_service = NotificationService()
