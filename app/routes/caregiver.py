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

@caregiver.route('/api/seniors')
@login_required
def api_seniors():
    """API endpoint to get caregiver seniors for Next.js"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    seniors_data = []
    
    for rel in relationships:
        senior = rel.senior
        # Basic stats
        meds = Medication.query.filter_by(user_id=senior.id).all()
        seniors_data.append({
            'id': senior.id,
            'name': senior.username,
            'medication_count': len(meds),
            'role': senior.role,
            'status': 'Stable' # Placeholder logic
        })
        
    return jsonify({
        'success': True,
        'data': seniors_data
    }), 200

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

@caregiver.route('/api/recent-logs')
@login_required
def get_recent_logs():
    """Get recent medication logs across all linked seniors"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    senior_ids = [rel.senior_id for rel in relationships]
    
    if not senior_ids:
        return jsonify({'success': True, 'logs': []})
    
    recent_logs = MedicationLog.query.filter(
        MedicationLog.user_id.in_(senior_ids)
    ).order_by(MedicationLog.taken_at.desc()).limit(15).all()
    
    logs_data = []
    for log in recent_logs:
        logs_data.append({
            'id': log.id,
            'senior_name': log.user.username,
            'medication_name': log.medication.name,
            'taken_at': log.taken_at.isoformat(),
            'taken_correctly': log.taken_correctly,
            'notes': log.notes
        })
        
    return jsonify({
        'success': True,
        'logs': logs_data
    })

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
        
        # Track what was handled today (taken or skipped)
        handled_med_ids = [log.medication_id for log in today_logs]
        
        for med in medications:
            # Get actual scheduled times
            reminder_times = med.get_reminder_times() if hasattr(med, 'get_reminder_times') else []
            missed_times = []
            
            for time_str in reminder_times:
                try:
                    hour, minute = map(int, time_str.split(':'))
                    scheduled_time = datetime(now.year, now.month, now.day, hour, minute)
                    
                    # If current time is 30+ mins past scheduled and med wasn't handled
                    if now > scheduled_time + timedelta(minutes=30):
                        if med.id not in handled_med_ids:
                            missed_times.append(time_str)
                except:
                    continue
            
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
    
    # Sort by priority
    priority_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
    alerts.sort(key=lambda x: priority_order.get(x['priority'], 2))
    
    return jsonify({
        'success': True,
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


@caregiver.route('/api/add-senior', methods=['POST'])
@login_required
def api_add_senior():
    """API endpoint to add a senior by username"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    from app.models.auth import User
    data = request.get_json()
    senior_username = data.get('username')
    
    if not senior_username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
        
    senior = User.query.filter_by(username=senior_username).first()
    
    if not senior:
        return jsonify({'success': False, 'message': 'Senior not found'}), 404
        
    if senior.role != 'senior':
        return jsonify({'success': False, 'message': 'User is not a senior citizen'}), 400
        
    existing = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior.id
    ).first()
    
    if existing:
        return jsonify({'success': False, 'message': 'Senior already in fleet'}), 400
        
    relationship = CaregiverSenior(
        caregiver_id=current_user.id,
        senior_id=senior.id,
        relationship_type='primary'
    )
    
    db.session.add(relationship)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Successfully attached {senior_username} to fleet',
        'senior': {
            'id': senior.id,
            'name': senior.username
        }
    })
