# app/routes/emergency.py
from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.emergency_contact import EmergencyContact
from datetime import datetime

emergency = Blueprint('emergency', __name__)

@emergency.route('/sos', methods=['GET', 'POST'])
@login_required
def sos():
    """Emergency SOS page and trigger"""
    if request.method == 'POST':
        return trigger_sos()
    
    # Get emergency contacts count for display
    contacts_count = EmergencyContact.query.filter_by(
        user_id=current_user.id,
        notify_for_emergency=True
    ).count()
    
    return render_template('emergency/sos.html', contacts_count=contacts_count)

@emergency.route('/api/trigger', methods=['POST'])
@login_required
def trigger_sos():
    """API endpoint to trigger emergency SOS"""
    try:
        user = current_user
        
        # Get medications for medical info
        medications = Medication.query.filter_by(user_id=user.id).all()
        med_list = [f"{m.name} ({m.dosage})" for m in medications]
        
        # Get all emergency contacts marked for SOS
        emergency_contacts = EmergencyContact.query.filter_by(
            user_id=user.id,
            notify_for_emergency=True
        ).order_by(EmergencyContact.priority).all()
        
        from app.utils.email_service import send_email
        
        subject = f"🆘 EMERGENCY SOS from {user.username} - MedGuardian"
        
        body = f"""
EMERGENCY ALERT!

This is an automated emergency alert from MedGuardian.

User: {user.username}
Email: {user.email}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Current Medications:
{chr(10).join(["- " + m for m in med_list]) if med_list else "No medications registered"}

Please check on this person immediately!

This alert was triggered through the MedGuardian Emergency SOS feature.
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">🆘 EMERGENCY SOS ALERT</h1>
            </div>
            <div style="padding: 20px;">
                <p><strong>User:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                
                <h3>Current Medications:</h3>
                <ul>
                    {"".join([f"<li>{m}</li>" for m in med_list]) if med_list else "<li>No medications registered</li>"}
                </ul>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px;">
                    <strong>⚠️ Please check on this person immediately!</strong>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send to all emergency contacts
        emails_sent = 0
        contacts_notified = []
        
        for contact in emergency_contacts:
            if contact.email:
                try:
                    send_email(subject, contact.email, body, html_body)
                    emails_sent += 1
                    contacts_notified.append(contact.name)
                except Exception as e:
                    print(f"Failed to send SOS email to {contact.email}: {e}")
        
        # Fallback: if no contacts or all failed, send to user's own email
        if emails_sent == 0:
            try:
                send_email(subject, user.email, body, html_body)
                emails_sent += 1
                contacts_notified.append("Self (fallback)")
            except Exception as e:
                print(f"Failed to send fallback SOS email: {e}")
        
        # Log the SOS event
        print(f"🆘 SOS triggered by {user.username} at {datetime.now()}")
        print(f"   Notified: {', '.join(contacts_notified) if contacts_notified else 'None'}")
        
        return jsonify({
            'success': True,
            'message': 'Emergency SOS activated!',
            'emails_sent': emails_sent,
            'contacts_notified': contacts_notified,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@emergency.route('/medical-info')
@login_required
def medical_info():
    """Show medical information for first responders"""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    emergency_contacts = EmergencyContact.query.filter_by(user_id=current_user.id)\
        .order_by(EmergencyContact.priority).all()
    
    return render_template('emergency/medical_info.html', 
                         user=current_user,
                         medications=medications,
                         emergency_contacts=emergency_contacts,
                         now=datetime.now())
