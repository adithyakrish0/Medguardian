"""
Email service configuration for Flask-Mail
"""
from flask_mail import Mail, Message
from flask import current_app
import os

mail = Mail()

def init_mail(app):
    """Initialize Flask-Mail with app"""
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com')
    
    mail.init_app(app)
    return mail

def send_email(subject, recipient, body, html_body=None):
    """
    Send an email
    
    Args:
        subject: Email subject
        recipient: Recipient email address
        body: Plain text body
        html_body: Optional HTML body
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[recipient] if isinstance(recipient, str) else recipient,
            body=body,
            html=html_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {e}")
        return False

def send_missed_dose_email(user_email, medication_name, scheduled_time):
    """Send email alert for missed medication dose"""
    subject = f"⚠️ Missed Medication Alert - {medication_name}"
    
    body = f"""
    Hello,
    
    You missed your scheduled dose of {medication_name} at {scheduled_time}.
    
    Please take your medication as soon as possible, or contact your healthcare provider if you have concerns.
    
    Best regards,
    MedGuardian Team
    """
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #721c24; margin-top: 0;">⚠️ Missed Medication Alert</h2>
            <p>You missed your scheduled dose of <strong>{medication_name}</strong> at <strong>{scheduled_time}</strong>.</p>
            <p>Please take your medication as soon as possible, or contact your healthcare provider if you have concerns.</p>
        </div>
        <p style="color: #666; font-size: 0.9em;">
            Best regards,<br>
            MedGuardian Team
        </p>
    </body>
    </html>
    """
    
    return send_email(subject, user_email, body, html_body)

def send_caregiver_alert_email(caregiver_email, senior_name, alert_type, details):
    """Send alert email to caregiver"""
    subject = f"🔔 Alert for {senior_name} - {alert_type}"
    
    body = f"""
    Hello Caregiver,
    
    This is an automated alert regarding {senior_name}:
    
    Alert Type: {alert_type}
    Details: {details}
    
    Please check the MedGuardian dashboard for more information.
    
    Best regards,
    MedGuardian Team
    """
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #856404; margin-top: 0;">🔔 Caregiver Alert</h2>
            <p><strong>Senior:</strong> {senior_name}</p>
            <p><strong>Alert Type:</strong> {alert_type}</p>
            <p><strong>Details:</strong> {details}</p>
        </div>
        <p>Please check the <a href="http://127.0.0.1:5000/caregiver/dashboard">MedGuardian dashboard</a> for more information.</p>
        <p style="color: #666; font-size: 0.9em;">
            Best regards,<br>
            MedGuardian Team
        </p>
    </body>
    </html>
    """
    
    return send_email(subject, caregiver_email, body, html_body)

def send_interaction_warning_email(user_email, medication1, medication2, severity):
    """Send email about medication interaction"""
    subject = f"⚠️ Medication Interaction Warning - {severity}"
    
    body = f"""
    Hello,
    
    We detected a potential {severity} interaction between your medications:
    
    - {medication1}
    - {medication2}
    
    Please review the interaction details in your MedGuardian dashboard and consult your healthcare provider.
    
    Best regards,
    MedGuardian Team
    """
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #721c24; margin-top: 0;">⚠️ Medication Interaction Warning</h2>
            <p>We detected a potential <strong>{severity}</strong> interaction between:</p>
            <ul>
                <li>{medication1}</li>
                <li>{medication2}</li>
            </ul>
            <p>Please review the details in your <a href="http://127.0.0.1:5000/interaction/">interaction checker</a> and consult your healthcare provider.</p>
        </div>
        <p style="color: #666; font-size: 0.9em;">
            Best regards,<br>
            MedGuardian Team
        </p>
    </body>
    </html>
    """
    
    return send_email(subject, user_email, body, html_body)
