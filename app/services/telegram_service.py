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
    
    def send_medication_reminder(self, chat_id, medication_name, dosage, time, instructions=None):
        """Send a medication reminder"""
        instruction_text = f"\n📝 <i>{instructions}</i>" if instructions else ""
        
        message = f"""
💊 <b>Time for Your Medication!</b>

<b>{medication_name}</b>
Dosage: {dosage}
Scheduled: {time}{instruction_text}

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
    
    def send_missed_dose_alert(self, chat_id, medication_name, scheduled_time, senior_name=None):
        """Send missed dose notification to user or caregiver"""
        if senior_name:
            # Alert for caregiver
            message = f"""
⚠️ <b>Missed Dose Alert</b>

<b>Senior:</b> {senior_name}
<b>Medication:</b> {medication_name}
<b>Was due at:</b> {scheduled_time}

The medication has not been taken. Please check on them.
            """
        else:
            # Alert for user themselves
            message = f"""
⚠️ <b>Missed Medication!</b>

<b>{medication_name}</b> was due at {scheduled_time}

You haven't marked this medication as taken.
If you've taken it, reply /taken
            """
        return self.send_message(chat_id, message.strip())
    
    def get_link_url(self, user_id):
        """Get the Telegram deep link for connecting account"""
        # Deep link format: https://t.me/BotUsername?start=UNIQUE_CODE
        link_code = f"link_{user_id}"
        return f"https://t.me/{self.bot_username}?start={link_code}"
    
    def get_updates(self, offset=None):
        """Get new messages from Telegram with offset tracking"""
        if not self.is_configured():
            return []
        
        try:
            url = f"{self.base_url}/getUpdates"
            params = {'timeout': 5}
            if offset:
                params['offset'] = offset
            
            response = requests.get(url, params=params, timeout=15)
            result = response.json()
            
            if result.get('ok'):
                return result.get('result', [])
            return []
        except Exception as e:
            print(f"Failed to get updates: {e}")
            return []
    
    def _link_user(self, chat_id, user_id):
        """Internal helper to link chat_id to user_id"""
        from app.models.auth import User
        from app.extensions import db
        
        user = User.query.get(user_id)
        if user:
            user.telegram_chat_id = str(chat_id)
            db.session.commit()
            
            self.send_message(
                chat_id,
                f"✅ <b>Account Linked!</b>\n\n"
                f"Hello {user.username}! Your MedGuardian account is now connected.\n\n"
                f"You will receive:\n"
                f"• 💊 Medication reminders\n"
                f"• 🆘 Emergency SOS alerts\n\n"
                f"Commands:\n"
                f"/status - Check your medications\n"
                f"/help - Get help"
            )
            print(f"✅ Telegram linked: user {user_id} -> chat {chat_id}")
        else:
            self.send_message(chat_id, f"❌ User ID {user_id} not found.")

    def process_update(self, update):
        """Process a single Telegram update"""
        try:
            message = update.get('message', {})
            text = message.get('text', '')
            chat_id = message.get('chat', {}).get('id')
            
            if not text or not chat_id:
                return
            
            if text.startswith('/start'):
                parts = text.split(' ')
                if len(parts) > 1 and parts[1].startswith('link_'):
                    # Link account via deep link
                    try:
                        user_id_str = parts[1].replace('link_', '')
                        user_id = int(user_id_str)
                        self._link_user(chat_id, user_id)
                        return
                    except Exception as e:
                        print(f"Deep link error: {e}")
                
                # New: Manual /link command
                if text.startswith('/link'):
                    try:
                        if len(parts) > 1:
                            user_id = int(parts[1])
                            self._link_user(chat_id, user_id)
                            return
                        else:
                            self.send_message(chat_id, "❌ Please provide your User ID. Example: <code>/link 17</code>")
                            return
                    except:
                        self.send_message(chat_id, "❌ Invalid User ID format.")
                        return
                
                # Regular /start
                self.send_message(
                    chat_id,
                    "👋 <b>Welcome to MedGuardian!</b>\n\n"
                    "To receive medication reminders, please link your account through the MedGuardian website.\n\n"
                    "<b>Option 1:</b> Click 'Connect Bot' in Settings.\n"
                    "<b>Option 2:</b> Type <code>/link YOUR_ID</code> (e.g., <code>/link 17</code>)\n\n"
                    "Go to: Settings → Telegram to find your ID if needed."
                )
            
            elif text == '/help':
                self.send_message(
                    chat_id,
                    "📖 <b>MedGuardian Bot Help</b>\n\n"
                    "/start - Start the bot\n"
                    "/status - Check your medication status\n"
                    "/help - Show this help\n\n"
                    "You will automatically receive:\n"
                    "• Medication reminders\n"
                    "• Emergency alerts\n"
                    "• Missed dose notifications"
                )
            
            elif text == '/status':
                from app.models.auth import User
                user = User.query.filter_by(telegram_chat_id=str(chat_id)).first()
                
                if user:
                    from app.models.medication import Medication
                    meds = Medication.query.filter_by(user_id=user.id).all()
                    
                    if meds:
                        med_list = "\n".join([f"• {m.name} ({m.dosage})" for m in meds])
                        self.send_message(chat_id, f"💊 <b>Your Medications</b>\n\n{med_list}")
                    else:
                        self.send_message(chat_id, "📭 You don't have any medications registered yet.")
                else:
                    self.send_message(chat_id, "❌ Your account is not linked. Please link through MedGuardian website.")
                    
        except Exception as e:
            print(f"Error processing update: {e}")


# Singleton instance
telegram_service = TelegramService()


def send_telegram_notification(chat_id, message):
    """Helper function to send telegram message"""
    return telegram_service.send_message(chat_id, message)


def start_telegram_polling(app):
    """Start background polling for Telegram updates (for local development)"""
    import threading
    import time
    
    def poll_loop():
        offset = None
        print("📡 Telegram polling started...")
        
        while True:
            try:
                with app.app_context():
                    updates = telegram_service.get_updates(offset)
                    
                    for update in updates:
                        telegram_service.process_update(update)
                        # Update offset to mark this message as processed
                        offset = update.get('update_id', 0) + 1
                
                time.sleep(2)  # Poll every 2 seconds
            except Exception as e:
                print(f"Polling error: {e}")
                time.sleep(5)
    
    if telegram_service.is_configured():
        thread = threading.Thread(target=poll_loop, daemon=True)
        thread.start()
        print("✅ Telegram polling thread started")
    else:
        print("⚠️ Telegram not configured, polling disabled")
