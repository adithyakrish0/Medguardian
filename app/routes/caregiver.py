from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.relationship import CaregiverSenior
from app.models.medication_log import MedicationLog
from datetime import datetime, timedelta
import json

caregiver = Blueprint('caregiver', __name__)

@caregiver.route('/dashboard')
@login_required
def dashboard():
    """Caregiver dashboard showing all assigned seniors"""
    if current_user.role != 'caregiver':
        flash('Access denied. Caregiver access required.', 'danger')
        return redirect(url_for('main.index'))
    
    # Get all seniors assigned to this caregiver
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    seniors = [rel.senior for rel in relationships]
    
    # Calculate statistics
    senior_stats = []
    for senior in seniors:
        medications = Medication.query.filter_by(user_id=senior.id).all()
        
        # Get today's logs
        today = datetime.now().date()
        today_logs = MedicationLog.query.filter(
            MedicationLog.user_id == senior.id,
            db.func.date(MedicationLog.taken_at) == today
        ).all()
        
        # Calculate compliance
        total_logs = MedicationLog.query.filter_by(user_id=senior.id).limit(30).all()
        taken_count = sum(1 for log in total_logs if log.taken_correctly)
        compliance_rate = int((taken_count / len(total_logs) * 100)) if total_logs else 0
        
        senior_stats.append({
            'senior': senior,
            'medication_count': len(medications),
            'taken_today': len([log for log in today_logs if log.taken_correctly]),
            'total_today': len(medications),
            'compliance_rate': compliance_rate,
            'last_active': max([log.taken_at for log in today_logs]) if today_logs else None
        })
    
    return render_template('caregiver/dashboard.html', 
                         senior_stats=senior_stats,
                         total_seniors=len(seniors))

@caregiver.route('/senior/<int:senior_id>')
@login_required
def senior_detail(senior_id):
    """View detailed information about a specific senior"""
    if current_user.role != 'caregiver':
        flash('Access denied.', 'danger')
        return redirect(url_for('main.index'))
    
    # Verify this senior is assigned to this caregiver
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id
    ).first_or_404()
    
    senior = relationship.senior
    medications = Medication.query.filter_by(user_id=senior_id).all()
    
    # Get recent logs
    recent_logs = MedicationLog.query.filter_by(
        user_id=senior_id
    ).order_by(MedicationLog.taken_at.desc()).limit(20).all()
    
    return render_template('caregiver/senior_detail.html',
                         senior=senior,
                         medications=medications,
                         recent_logs=recent_logs,
                         relationship=relationship)

@caregiver.route('/api/alerts')
@login_required
def get_alerts():
    """API endpoint to get caregiver alerts"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    alerts = []
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    
    today = datetime.now().date()
    now = datetime.now()
    
    for rel in relationships:
        senior = rel.senior
        medications = Medication.query.filter_by(user_id=senior.id).all()
        
        # Get today's logs
        today_logs = MedicationLog.query.filter(
            MedicationLog.user_id == senior.id,
            db.func.date(MedicationLog.taken_at) == today
        ).all()
        
        taken_med_ids = [log.medication_id for log in today_logs if log.taken_correctly]
        
        # Check for missed medications
        for med in medications:
            # Check each scheduled time
            missed_times = []
            
            if med.morning and now.hour >= 10:  # 2 hours past 8 AM
                if med.id not in taken_med_ids:
                    missed_times.append('Morning (8 AM)')
            
            if med.afternoon and now.hour >= 16:  # 2 hours past 2 PM
                if med.id not in taken_med_ids:
                    missed_times.append('Afternoon (2 PM)')
            
            if med.evening and now.hour >= 20:  # 2 hours past 6 PM
                if med.id not in taken_med_ids:
                    missed_times.append('Evening (6 PM)')
            
            if med.night and now.hour >= 23:  # 2 hours past 9 PM
                if med.id not in taken_med_ids:
                    missed_times.append('Night (9 PM)')
            
            # Check custom times
            if med.custom_reminder_times:
                try:
                    custom_times = json.loads(med.custom_reminder_times)
                    for time_str in custom_times:
                        hour, minute = map(int, time_str.split(':'))
                        scheduled_time = datetime(now.year, now.month, now.day, hour, minute)
                        # Check if 30 mins past scheduled time
                        if now > scheduled_time + timedelta(minutes=30):
                            if med.id not in taken_med_ids:
                                missed_times.append(f'Custom ({time_str})')
                except:
                    pass
            
            if missed_times:
                alerts.append({
                    'senior_name': senior.username,
                    'senior_id': senior.id,
                    'medication_name': med.name,
                    'medication_id': med.id,
                    'missed_times': missed_times,
                    'priority': med.priority or 'normal',
                    'type': 'missed_dose'
                })
    
    # Sort by priority (critical first)
    priority_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
    alerts.sort(key=lambda x: priority_order.get(x['priority'], 2))
    
    return jsonify({
        'alerts': alerts,
        'count': len(alerts),
        'timestamp': now.isoformat()
    })

@caregiver.route('/api/send-reminder/<int:senior_id>/<int:medication_id>', methods=['POST'])
@login_required
def send_reminder(senior_id, medication_id):
    """Send a reminder to a senior about a specific medication"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    # Verify relationship
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id
    ).first()
    
    if not relationship:
        return jsonify({'error': 'Senior not found in your care list'}), 404
    
    medication = Medication.query.get(medication_id)
    if not medication or medication.user_id != senior_id:
        return jsonify({'error': 'Medication not found'}), 404
    
    # Here you could send an email/SMS to the senior
    # For now, we'll just return success
    from app.utils.email_service import send_email
    senior = relationship.senior
    
    try:
        send_email(
            subject=f"💊 Medication Reminder from {current_user.username}",
            recipient=senior.email,
            body=f"Hi {senior.username},\n\nYour caregiver {current_user.username} is reminding you to take your {medication.name}.\n\nPlease take your medication as soon as possible.\n\nBest regards,\nMedGuardian"
        )
        return jsonify({'success': True, 'message': f'Reminder sent to {senior.username}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

