from datetime import datetime, timedelta
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.emergency_contact import EmergencyContact
from flask import jsonify, session
import time
import threading
import json
import smtplib
# from email.mime.text import MimeText  # Commented out for now
# from email.mime.multipart import MimeMultipart  # Commented out for now
from flask_socketio import SocketIO, emit
import logging

class MedicationAlarmSystem:
    def __init__(self, app, socketio=None):
        self.app = app
        self.socketio = socketio
        self.enabled = True
        self.alarm_active = False
        self.check_interval = 30  # Check every 30 seconds
        self.active_alarms = {}  # Track active alarms to prevent spam
        self.alarm_cooldown = 300  # 5 minutes cooldown between alarms
        
        # Start background thread
        self.running = True
        self.check_thread = threading.Thread(target=self._background_checker, daemon=True)
        self.check_thread.start()
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _background_checker(self):
        """Background thread for continuous monitoring"""
        while self.running:
            try:
                self.check_reminders()
                time.sleep(self.check_interval)
            except Exception as e:
                self.logger.error(f"Background checker error: {e}")
                time.sleep(self.check_interval)
    
    def check_reminders(self):
        """Check and send reminders - real-time monitoring"""
        if not self.enabled:
            return
            
        try:
            with self.app.app_context():
                now = datetime.now()
                current_time = now.time()
                current_date = now.date()
                
                medications = Medication.query.filter_by(reminder_enabled=True).all()
                
                for med in medications:
                    if self._should_alarm(med, current_time, current_date):
                        self._send_alarm(med, now)
                        
        except Exception as e:
            self.logger.error(f"Alarm system error: {e}")
    
    def _should_alarm(self, medication, current_time, current_date):
        """Check if medication alarm should be triggered"""
        # Check if medication is active today
        try:
            if hasattr(medication, 'start_date') and medication.start_date and medication.start_date > current_date:
                return False
            if hasattr(medication, 'end_date') and medication.end_date and medication.end_date < current_date:
                return False
        except Exception as e:
            # If dates are None or invalid, continue with alarm checking
            self.logger.debug(f"Date validation error: {e}")
            
        # Check alarm cooldown
        alarm_key = f"{medication.id}_{current_date}"
        if alarm_key in self.active_alarms:
            if (datetime.now() - self.active_alarms[alarm_key]) < timedelta(seconds=self.alarm_cooldown):
                return False
        
        # Check time-based alarms
        if medication.morning and datetime.strptime("07:30", "%H:%M").time() <= current_time < datetime.strptime("09:00", "%H:%M").time():
            return True
        elif medication.afternoon and datetime.strptime("12:00", "%H:%M").time() <= current_time < datetime.strptime("14:00", "%H:%M").time():
            return True
        elif medication.evening and datetime.strptime("18:00", "%H:%M").time() <= current_time < datetime.strptime("20:00", "%H:%M").time():
            return True
        elif medication.night and (datetime.strptime("21:00", "%H:%M").time() <= current_time or current_time < datetime.strptime("01:00", "%H:%M").time()):
            return True
            
        # Check custom time alarms
        if hasattr(medication, 'custom_reminder_times') and medication.custom_reminder_times:
            try:
                import json
                custom_times = json.loads(medication.custom_reminder_times) if isinstance(medication.custom_reminder_times, str) else medication.custom_reminder_times
                for custom_time in custom_times:
                    try:
                        alarm_time = datetime.strptime(custom_time, "%H:%M").time()
                        time_diff = abs((datetime.combine(current_date, current_time) - datetime.combine(current_date, alarm_time)).total_seconds())
                        if time_diff <= 300:  # Within 5 minutes
                            return True
                    except:
                        pass  # Invalid custom time, continue with next
            except Exception:
                pass  # Invalid custom_times format, continue with next
                    
        return False
    
    def _send_alarm(self, medication, alarm_time):
        """Send comprehensive alarm for medication"""
        try:
            now = datetime.now()
            
            # Track alarm activation
            alarm_key = f"{medication.id}_{now.date()}"
            self.active_alarms[alarm_key] = now
            
            # Log alarm event
            log = MedicationLog(
                medication_id=medication.id,
                user_id=medication.user_id,
                taken_correctly=False,
                notes=f"Alarm triggered at {alarm_time.strftime('%H:%M:%S')}"
            )
            db.session.add(log)
            
            # Send different types of alarms
            self._send_visual_alarm(medication, alarm_time)
            self._send_audio_alarm(medication, alarm_time)
            self._send_notification_alarm(medication, alarm_time)
            self._send_caregiver_alert(medication, alarm_time)
            
            db.session.commit()
            self.logger.info(f"🚨 Alarm sent for {medication.name} at {alarm_time.strftime('%H:%M:%S')}")
            
        except Exception as e:
            self.logger.error(f"Failed to send alarm for {medication.name}: {e}")
    
    def _send_visual_alarm(self, medication, alarm_time):
        """Send visual alarm popup"""
        try:
            if self.socketio:
                alarm_data = {
                    'type': 'medication_alarm',
                    'medication': {
                        'id': medication.id,
                        'name': medication.name,
                        'dosage': medication.dosage,
                        'priority': medication.priority,
                        'instructions': medication.instructions or 'No specific instructions'
                    },
                    'time': alarm_time.strftime('%H:%M:%S'),
                    'user_id': medication.user_id,
                    'user_name': medication.user.username if medication.user else 'Unknown'
                }
                
                # Send to senior's session
                if hasattr(medication.user, 'session_id'):
                    self.socketio.emit('medication_alarm', alarm_data, room=medication.user.session_id)
                
                # Broadcast to all caregivers for this senior
                self.socketio.emit('caregiver_medication_alarm', alarm_data, namespace='/caregivers')
                
        except Exception as e:
            self.logger.error(f"Visual alarm error: {e}")
    
    def _send_audio_alarm(self, medication, alarm_time):
        """Send audio alarm"""
        try:
            if self.socketio:
                audio_data = {
                    'type': 'audio_alarm',
                    'medication_name': medication.name,
                    'priority': medication.priority,
                    'sound': 'medication_reminder' if medication.priority != 'critical' else 'emergency_alarm'
                }
                
                # Send audio to senior's session
                if hasattr(medication.user, 'session_id'):
                    self.socketio.emit('audio_alarm', audio_data, room=medication.user.session_id)
                    
        except Exception as e:
            self.logger.error(f"Audio alarm error: {e}")
    
    def _send_notification_alarm(self, medication, alarm_time):
        """Send in-browser notification"""
        try:
            if self.socketio:
                notification_data = {
                    'type': 'browser_notification',
                    'title': '⏰ Medication Reminder',
                    'body': f"It's time to take your {medication.name} ({medication.dosage})",
                    'icon': '/static/images/pill-icon.png'
                }
                
                # Send browser notification
                if hasattr(medication.user, 'session_id'):
                    self.socketio.emit('browser_notification', notification_data, room=medication.user.session_id)
                    
        except Exception as e:
            self.logger.error(f"Notification alarm error: {e}")
    
    def _send_caregiver_alert(self, medication, alarm_time):
        """Send alert to caregivers"""
        try:
            if self.socketio:
                caregiver_data = {
                    'type': 'caregiver_alert',
                    'medication': {
                        'id': medication.id,
                        'name': medication.name,
                        'dosage': medication.dosage,
                        'priority': medication.priority,
                        'user_name': medication.user.username if medication.user else 'Unknown'
                    },
                    'time': alarm_time.strftime('%H:%M:%S'),
                    'alert_level': 'high' if medication.priority == 'critical' else 'medium'
                }
                
                # Send to all caregivers
                self.socketio.emit('new_medication_alert', caregiver_data, namespace='/caregivers')
                
        except Exception as e:
            self.logger.error(f"Caregiver alert error: {e}")
    
    def acknowledge_alarm(self, medication_id, user_id):
        """Acknowledge alarm and mark as taken"""
        try:
            with self.app.app_context():
                log = MedicationLog(
                    medication_id=medication_id,
                    user_id=user_id,
                    taken_correctly=True,
                    notes="Alarm acknowledged and medication taken"
                )
                db.session.add(log)
                db.session.commit()
                
                # Remove from active alarms
                now = datetime.now()
                current_date = now.date()
                alarm_key = f"{medication_id}_{current_date}"
                if alarm_key in self.active_alarms:
                    del self.active_alarms[alarm_key]
                    
                self.logger.info(f"Alarm acknowledged for medication {medication_id}")
                
        except Exception as e:
            self.logger.error(f"Failed to acknowledge alarm: {e}")
    
    def miss_alarm(self, medication_id, user_id, reason="Missed alarm"):
        """Mark alarm as missed"""
        try:
            with self.app.app_context():
                log = MedicationLog(
                    medication_id=medication_id,
                    user_id=user_id,
                    taken_correctly=False,
                    notes=f"Missed: {reason}"
                )
                db.session.add(log)
                db.session.commit()
                
                # Send emergency alert if critical medication missed
                with self.app.app_context():
                    medication = Medication.query.get(medication_id)
                    if medication and medication.priority == 'critical':
                        self._send_emergency_alert(medication, reason)
                        
                self.logger.warning(f"Alarm missed for medication {medication_id}: {reason}")
                
        except Exception as e:
            self.logger.error(f"Failed to mark alarm missed: {e}")
    
    def _send_emergency_alert(self, medication, reason):
        """Send emergency alert for critical missed medications"""
        try:
            if self.socketio:
                emergency_data = {
                    'type': 'emergency_alert',
                    'medication': {
                        'id': medication.id,
                        'name': medication.name,
                        'dosage': medication.dosage,
                        'user_name': medication.user.username if medication.user else 'Unknown'
                    },
                    'reason': reason,
                    'time': datetime.now().strftime('%H:%M:%S'),
                    'severity': 'critical'
                }
                
                # Send to all caregivers and emergency contacts
                self.socketio.emit('emergency_medication_alert', emergency_data, namespace='/caregivers')
                self.socketio.emit('emergency_medication_alert', emergency_data, namespace='/emergency')
                
                # Also send SMS/email if configured
                self._send_emergency_notification(medication, reason)
                
        except Exception as e:
            self.logger.error(f"Emergency alert error: {e}")
    
    def _send_emergency_notification(self, medication, reason):
        """Send SMS/email emergency notification"""
        try:
            with self.app.app_context():
                emergency_contacts = EmergencyContact.query.filter_by(user_id=medication.user_id).all()
                
                for contact in emergency_contacts:
                    if contact.phone:
                        self._send_sms_alert(contact.phone, medication, reason)
                    if contact.email:
                        self._send_email_alert(contact.email, medication, reason)
                        
        except Exception as e:
            self.logger.error(f"Emergency notification error: {e}")
    
    def _send_sms_alert(self, phone_number, medication, reason):
        """Send SMS alert (placeholder - would integrate with SMS service)"""
        try:
            message = f"🚨 EMERGENCY: {medication.user.username} missed critical medication {medication.name}. Reason: {reason}. Please check on them immediately."
            # Would integrate with SMS API here
            self.logger.info(f"SMS alert would be sent to {phone_number}: {message}")
        except Exception as e:
            self.logger.error(f"SMS alert error: {e}")
    
    def _send_email_alert(self, email_address, medication, reason):
        """Send email alert (placeholder)"""
        try:
            # Placeholder for email functionality
            message = f"🚨 EMERGENCY: {medication.user.username} missed critical medication {medication.name}. Reason: {reason}. Please check on them immediately."
            self.logger.info(f"Email alert would be sent to {email_address}: {message}")
            
        except Exception as e:
            self.logger.error(f"Email alert error: {e}")
    
    def get_active_alarms(self, user_id=None):
        """Get list of active alarms"""
        try:
            with self.app.app_context():
                now = datetime.now()
                active_list = []
                
                for alarm_key, alarm_time in self.active_alarms.items():
                    med_id, alarm_date = alarm_key.split('_')
                    medication = Medication.query.get(med_id)
                    
                    if medication and (not user_id or medication.user_id == user_id):
                        if now.date() == datetime.strptime(alarm_date, '%Y-%m-%d').date():
                            active_list.append({
                                'medication': {
                                    'id': medication.id,
                                    'name': medication.name,
                                    'dosage': medication.dosage,
                                    'priority': medication.priority
                                },
                                'triggered_at': alarm_time.strftime('%H:%M:%S'),
                                'time_remaining': str(alarm_time + timedelta(minutes=5) - now).split('.')[0]  # 5 minute window
                            })
                
                return active_list
                
        except Exception as e:
            self.logger.error(f"Error getting active alarms: {e}")
            return []
    
    def enable(self):
        """Enable alarm system"""
        self.enabled = True
        if not self.running:
            self.running = True
            self.check_thread = threading.Thread(target=self._background_checker, daemon=True)
            self.check_thread.start()
    
    def disable(self):
        """Disable alarm system"""
        self.enabled = False
        self.running = False
    
    def shutdown(self):
        """Shutdown alarm system"""
        self.running = False
        self.enabled = False
        if hasattr(self, 'check_thread') and self.check_thread.is_alive():
            self.check_thread.join(timeout=5)
