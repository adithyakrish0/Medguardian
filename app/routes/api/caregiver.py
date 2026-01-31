"""API v1 - Caregiver endpoints"""
from flask import jsonify, request, current_app
from flask_login import login_required, current_user
from . import api_v1
from app.extensions import db
from app.models.auth import User
from app.models.medication import Medication
from app.models.relationship import CaregiverSenior
from app.models.medication_log import MedicationLog
from datetime import datetime, timedelta
from app.utils.export import export_fleet_to_pdf

@api_v1.route('/caregiver/seniors', methods=['GET'])
@login_required
def get_seniors():
    """Get all seniors assigned to the current caregiver"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    from app.services.analytics_service import analytics_service
    
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    seniors_data = []
    
    for rel in relationships:
        senior = rel.senior
        meds = Medication.query.filter_by(user_id=senior.id).all()
        
        # Calculate risk score and status
        risk_score = analytics_service.calculate_risk_score(senior.id)
        status = 'Stable'
        if risk_score > 100:
            status = 'Critical'
        elif risk_score > 40:
            status = 'Attention'
            
        seniors_data.append({
            'id': senior.id,
            'name': senior.username,
            'phone': senior.phone,
            'medication_count': len(meds),
            'role': senior.role,
            'connection_status': rel.status,
            'status': status,
            'risk_score': risk_score,
            'created_at': senior.created_at.isoformat(),
            'adherence_history': analytics_service.get_7_day_adherence(senior.id)
        })
    
    # Sort by risk score descending
    seniors_data.sort(key=lambda x: x['risk_score'], reverse=True)
        
    return jsonify({
        'success': True,
        'data': seniors_data
    }), 200

@api_v1.route('/caregiver/add-senior', methods=['POST'])
@login_required
def add_senior():
    """Connect a new senior to the caregiver's fleet"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
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
    
    # Audit log
    from app.services.audit_service import audit_service
    audit_service.log_event(
        action='add_senior_request',
        target_id=senior.id,
        details=f"Caregiver requested connection with senior {senior.username}"
    )
    
    return jsonify({
        'success': True,
        'message': f'Connection request sent to {senior_username}. They must approve it before you can see their data.',
        'senior': {
            'id': senior.id,
            'name': senior_username
        }
    })

@api_v1.route('/caregiver/alerts', methods=['GET'])
@login_required
def get_alerts():
    """Get alerts for all managed seniors"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    alerts = []
    relationships = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        status='accepted'
    ).all()
    
    today = datetime.now().date()
    now = datetime.now()
    
    for rel in relationships:
        senior = rel.senior
        medications = Medication.query.filter_by(user_id=senior.id).all()
        today_logs = MedicationLog.query.filter(
            MedicationLog.user_id == senior.id,
            db.func.date(MedicationLog.taken_at) == today
        ).all()
        
        handled_med_ids = [log.medication_id for log in today_logs]
        
        for med in medications:
            reminder_times = med.get_reminder_times() if hasattr(med, 'get_reminder_times') else []
            missed_times = []
            
            for time_str in reminder_times:
                try:
                    hour, minute = map(int, time_str.split(':'))
                    scheduled_time = datetime(now.year, now.month, now.day, hour, minute)
                    if now > scheduled_time + timedelta(minutes=30):
                        if med.id not in handled_med_ids:
                            missed_times.append(time_str)
                except: continue
            
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
    
    priority_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
    alerts.sort(key=lambda x: priority_order.get(x['priority'], 2))
    
    return jsonify({
        'success': True,
        'alerts': alerts,
        'count': len(alerts),
        'timestamp': now.isoformat()
    })

@api_v1.route('/caregiver/recent-logs', methods=['GET'])
@login_required
def get_recent_logs():
    """Get recent medication logs across all linked seniors"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    relationships = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        status='accepted'
    ).all()
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

@api_v1.route('/caregiver/send-reminder/<int:senior_id>/<int:medication_id>', methods=['POST'])
@login_required
def send_reminder(senior_id, medication_id):
    """Send a reminder to a senior about a specific medication"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id,
        status='accepted'
    ).first()
    
    if not relationship:
        return jsonify({'error': 'Senior not found in your care list'}), 404
    
    medication = Medication.query.get(medication_id)
    if not medication or medication.user_id != senior_id:
        return jsonify({'error': 'Medication not found'}), 404
    
    from app.utils.email_service import send_email
    senior = relationship.senior
    
    try:
        current_app.logger.info(f"📧 Starting reminder process for senior {senior.username} ({senior_id}), med {medication.name}")
        
        # Email is optional - don't let it crash the whole request if unconfigured
        email_sent = False
        try:
            from app.utils.email_service import send_email
            email_sent = send_email(
                subject=f"💊 Medication Reminder from {current_user.username}",
                recipient=senior.email,
                body=f"Hi {senior.username},\n\nYour caregiver {current_user.username} is reminding you to take your {medication.name}.\n\nPlease take your medication as soon as possible.\n\nBest regards,\nMedGuardian"
            )
            current_app.logger.info(f"📧 Email sent status: {email_sent}")
        except Exception as e:
            current_app.logger.warning(f"⚠️ Email reminder failed (likely unconfigured SMTP): {e}")
        
        # Real-time dashboard nudge (This is the primary way caregivers communicate)
        from app.services.notification_service import notification_service
        from datetime import datetime
        
        current_app.logger.info(f"🛰️ Sending SocketIO nudge to room user_{senior_id}")
        notification_service.send_socketio_event('medication_reminder', {
            'type': 'caregiver_nudge',
            'caregiver_name': current_user.username,
            'medication_name': medication.name,
            'timestamp': datetime.now().isoformat()
        }, room=f'user_{senior_id}')
        
        msg = f'Reminder sent to {senior.username}'
        if not email_sent:
            msg += " (Dashboard nudge only)"
            
        current_app.logger.info("✅ Reminder process completed")
        return jsonify({'success': True, 'message': msg})
    except Exception as e:
        current_app.logger.error(f"❌ Critical error in send_reminder: {str(e)}")
        return jsonify({'success': False, 'error': "Failed to process reminder request"}), 500
@api_v1.route('/caregiver/remove-senior/<int:senior_id>', methods=['DELETE'])
@login_required
def remove_senior(senior_id):
    """Disconnect a senior from the caregiver's fleet"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
        
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id
    ).first()
    
    if not relationship:
        return jsonify({'success': False, 'message': 'Senior not found in your fleet'}), 404
        
    db.session.delete(relationship)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Successfully disconnected senior from fleet'
    })
@api_v1.route('/caregiver/request-camera/<int:senior_id>', methods=['POST'])
@login_required
def request_camera(senior_id):
    """Caregiver requests to see senior's camera for emergency/checkup"""
    if current_user.role != 'caregiver':
        return jsonify({'error': 'Access denied'}), 403
    
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id,
        status='accepted'
    ).first()
    
    if not relationship:
        return jsonify({'error': 'Senior not found in your care list'}), 404
    
    senior = relationship.senior
    
    # Send real-time request to senior
    from app.services.notification_service import notification_service
    notification_service.send_socketio_event('camera_request', {
        'caregiver_id': current_user.id,
        'caregiver_name': current_user.username,
        'timestamp': datetime.now().isoformat()
    }, room=f'user_{senior_id}')
    
@api_v1.route('/caregiver/export/fleet/pdf', methods=['GET'])
@login_required
def export_fleet_pdf():
    """Export summary report for the entire managed fleet (Proxied API)"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
        
    # Get all accepted seniors
    relationships = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        status='accepted'
    ).all()
    
    fleet_data = []
    for rel in relationships:
        senior = rel.senior
        logs = MedicationLog.query.filter_by(user_id=senior.id).all()
        meds = Medication.query.filter_by(user_id=senior.id).all()
        fleet_data.append({
            'senior': senior,
            'logs': logs,
            'medications': meds
        })
        
    if not fleet_data:
        return jsonify({'success': False, 'message': 'No seniors in fleet to export'}), 404
        
    from app.services.audit_service import audit_service
    audit_service.log_action(
        user_id=current_user.id,
        action='FLEET_PDF_EXPORT',
        details=f"Caregiver exported clinical summary for {len(fleet_data)} seniors"
    )
    
    return export_fleet_to_pdf(fleet_data, current_user)

@api_v1.route('/caregiver/telemetry-fleet', methods=['GET'])
@login_required
def get_fleet_telemetry_api():
    """Get high-density telemetry for the fleet (Sparklines + Heatmap)"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
        
    try:
        from app.services.analytics_service import analytics_service
        data = analytics_service.get_fleet_telemetry(current_user.id)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
