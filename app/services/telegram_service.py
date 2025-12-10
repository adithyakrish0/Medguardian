# app/services/telegram_service.py
"""
Telegram Bot Service for MedGuardian
Sends notifications via Telegram
"""
import os
import requests
from flask import current_app

class TelegramService:
    """Service for sending Telegram notifications"""
    
    def __init__(self):
        self.token = os.environ.get('TELEGRAM_BOT_TOKEN')
        self.bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', 'MedGuardianpy_bot')
        self.base_url = f"https://api.telegram.org/bot{self.token}" if self.token else None
    
    def is_configured(self):
        """Check if Telegram is configured"""
        return bool(self.token)
    
    def send_message(self, chat_id, message, parse_mode='HTML'):
        """Send a message to a Telegram chat"""
        if not self.is_configured():
            print("⚠️ Telegram not configured")
            return False
        
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': parse_mode
            }
            response = requests.post(url, data=data, timeout=10)
            result = response.json()
            
            if result.get('ok'):
                print(f"✅ Telegram message sent to {chat_id}")
                return True
            else:
                print(f"❌ Telegram error: {result.get('description')}")
                return False
        except Exception as e:
            print(f"❌ Telegram send failed: {e}")
            return False
    
    def send_medication_reminder(self, chat_id, medication_name, dosage, time_str):
        """Send a medication reminder"""
        message = f"""
💊 <b>Medication Reminder!</b>

<b>{medication_name}</b>
Dosage: {dosage}
Time: {time_str}

Please take your medication now.
Reply /taken when done ✅
        """
        return self.send_message(chat_id, message.strip())
    
    def send_sos_alert(self, chat_id, user_name, user_email, medications):
        """Send emergency SOS alert"""
        med_list = "\n".join([f"• {m}" for m in medications]) if medications else "No medications"
        
        message = f"""
🆘 <b>EMERGENCY SOS ALERT!</b>

<b>User:</b> {user_name}
<b>Email:</b> {user_email}
<b>Time:</b> Now

<b>Current Medications:</b>
{med_list}

⚠️ Please check on this person immediately!
        """
        return self.send_message(chat_id, message.strip())
    
    def send_missed_dose_alert(self, chat_id, user_name, medication_name, scheduled_time):
        """Send missed dose notification to caregiver/contact"""
        message = f"""
⚠️ <b>Missed Dose Alert</b>

<b>User:</b> {user_name}
<b>Medication:</b> {medication_name}
<b>Scheduled:</b> {scheduled_time}

The medication was not taken on time.
        """
        return self.send_message(chat_id, message.strip())
    
    def get_link_url(self, user_id):
        """Get the Telegram deep link for connecting account"""
        # Deep link format: https://t.me/BotUsername?start=UNIQUE_CODE
        link_code = f"link_{user_id}"
        return f"https://t.me/{self.bot_username}?start={link_code}"
    
    def get_updates(self):
        """Get new messages (for webhook or polling)"""
        if not self.is_configured():
            return []
        
        try:
            url = f"{self.base_url}/getUpdates"
            response = requests.get(url, timeout=10)
            result = response.json()
            
            if result.get('ok'):
                return result.get('result', [])
            return []
        except Exception as e:
            print(f"Failed to get updates: {e}")
            return []


# Singleton instance
telegram_service = TelegramService()


def send_telegram_notification(chat_id, message):
    """Helper function to send telegram message"""
    return telegram_service.send_message(chat_id, message)
