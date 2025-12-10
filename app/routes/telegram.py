# app/routes/telegram.py
"""
Telegram Bot routes for MedGuardian
Handles account linking and webhook
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.extensions import db
from app.services.telegram_service import telegram_service
import os

telegram = Blueprint('telegram', __name__)

@telegram.route('/')
@login_required
def settings():
    """Telegram settings page"""
    is_linked = bool(current_user.telegram_chat_id)
    link_url = telegram_service.get_link_url(current_user.id)
    bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', 'MedGuardianpy_bot')
    
    return render_template('telegram/settings.html',
                         is_linked=is_linked,
                         link_url=link_url,
                         bot_username=bot_username)

@telegram.route('/link')
@login_required
def get_link():
    """Get Telegram linking URL"""
    link_url = telegram_service.get_link_url(current_user.id)
    return jsonify({
        'success': True,
        'link_url': link_url,
        'bot_username': os.environ.get('TELEGRAM_BOT_USERNAME', 'MedGuardianpy_bot')
    })

@telegram.route('/unlink', methods=['POST'])
@login_required
def unlink():
    """Unlink Telegram account"""
    current_user.telegram_chat_id = None
    db.session.commit()
    flash('Telegram account unlinked successfully.', 'success')
    return redirect(url_for('telegram.settings'))

@telegram.route('/test', methods=['POST'])
@login_required
def test_notification():
    """Send a test notification"""
    if not current_user.telegram_chat_id:
        return jsonify({'success': False, 'error': 'Telegram not linked'})
    
    success = telegram_service.send_message(
        current_user.telegram_chat_id,
        "🎉 <b>Test Notification</b>\n\nYour MedGuardian Telegram notifications are working!"
    )
    
    return jsonify({
        'success': success,
        'message': 'Test notification sent!' if success else 'Failed to send'
    })

@telegram.route('/webhook', methods=['POST'])
def webhook():
    """Handle Telegram webhook updates"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'ok': True})
        
        # Handle /start command with link code
        message = data.get('message', {})
        text = message.get('text', '')
        chat_id = message.get('chat', {}).get('id')
        
        if text.startswith('/start'):
            parts = text.split(' ')
            if len(parts) > 1 and parts[1].startswith('link_'):
                # Extract user ID from link code
                try:
                    user_id = int(parts[1].replace('link_', ''))
                    
                    # Find user and link their account
                    from app.models.auth import User
                    user = User.query.get(user_id)
                    
                    if user:
                        user.telegram_chat_id = str(chat_id)
                        db.session.commit()
                        
                        telegram_service.send_message(
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
                        return jsonify({'ok': True})
                except:
                    pass
            
            # Regular /start without link
            telegram_service.send_message(
                chat_id,
                "👋 <b>Welcome to MedGuardian!</b>\n\n"
                "To receive medication reminders, please link your account through the MedGuardian website.\n\n"
                "Go to: Settings → Telegram → Link Account"
            )
        
        elif text == '/help':
            telegram_service.send_message(
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
            # Find user by chat_id
            from app.models.auth import User
            user = User.query.filter_by(telegram_chat_id=str(chat_id)).first()
            
            if user:
                from app.models.medication import Medication
                meds = Medication.query.filter_by(user_id=user.id).all()
                
                if meds:
                    med_list = "\n".join([f"• {m.name} ({m.dosage})" for m in meds])
                    telegram_service.send_message(
                        chat_id,
                        f"💊 <b>Your Medications</b>\n\n{med_list}"
                    )
                else:
                    telegram_service.send_message(
                        chat_id,
                        "📭 You don't have any medications registered yet."
                    )
            else:
                telegram_service.send_message(
                    chat_id,
                    "❌ Your account is not linked. Please link through MedGuardian website."
                )
        
        return jsonify({'ok': True})
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'ok': True})

@telegram.route('/poll')
def poll_updates():
    """Manual polling for updates (alternative to webhook)"""
    try:
        updates = telegram_service.get_updates()
        
        for update in updates:
            # Process each update
            message = update.get('message', {})
            text = message.get('text', '')
            chat_id = message.get('chat', {}).get('id')
            
            if text and text.startswith('/start link_'):
                parts = text.split(' ')
                if len(parts) > 1:
                    link_code = parts[1]
                    user_id = int(link_code.replace('link_', ''))
                    
                    from app.models.auth import User
                    user = User.query.get(user_id)
                    
                    if user:
                        user.telegram_chat_id = str(chat_id)
                        db.session.commit()
                        
                        telegram_service.send_message(
                            chat_id,
                            f"✅ Account linked successfully!\nHello {user.username}!"
                        )
        
        return jsonify({'ok': True, 'processed': len(updates)})
        
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})
