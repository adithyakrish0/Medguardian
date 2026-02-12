"""API v1 - Medication endpoints"""
import sys
import traceback
from flask import jsonify, request
from flask_login import login_required, current_user
from pydantic import ValidationError
from . import api_v1
from app.services import MedicationService
from app.utils.validators import MedicationCreateSchema, MedicationUpdateSchema


@api_v1.route('/medications', methods=['GET'])
@login_required
def get_medications():
    """Get all medications for current user or linked senior"""
    try:
        senior_id = request.args.get('senior_id', type=int)
        
        # Security: If senior_id is provided, verify current user is a linked caregiver
        user_id = current_user.id
        if senior_id and senior_id != current_user.id:
            from app.models.relationship import CaregiverSenior
            relationship = CaregiverSenior.query.filter_by(
                caregiver_id=current_user.id,
                senior_id=senior_id
            ).first()
            if not relationship:
                return jsonify({'success': False, 'error': 'Access denied to this senior\'s data'}), 403
            user_id = senior_id
            
        medications = MedicationService.get_all_for_user(user_id)
        
        return jsonify({
            'success': True,
            'count': len(medications),
            'data': [med.to_dict() for med in medications]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>', methods=['GET'])
@login_required
def get_medication(medication_id):
    """Get single medication by ID"""
    try:
        medication = MedicationService.get_by_id(medication_id, current_user.id)
        
        if not medication:
            return jsonify({
                'success': False,
                'error': 'Medication not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': medication.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications', methods=['POST'])
@login_required
def create_medication():
    """Create new medication"""
    try:
        # Validate input
        data = MedicationCreateSchema(**request.json)
        
        # Create medication
        medication = MedicationService.create(current_user.id, data.dict())
        
        return jsonify({
            'success': True,
            'message': 'Medication created successfully',
            'data': medication.to_dict()
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation error',
            'details': e.errors()
        }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>', methods=['PUT', 'PATCH'])
@login_required
def update_medication(medication_id):
    """Update existing medication"""
    try:
        # Validate input
        data = MedicationUpdateSchema(**request.json)
        
        # Update medication
        medication = MedicationService.update(
            medication_id, 
            data.dict(exclude_unset=True),
            current_user.id
        )
        
        if not medication:
            return jsonify({
                'success': False,
                'error': 'Medication not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Medication updated successfully',
            'data': medication.to_dict()
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation error',
            'details': e.errors()
        }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>', methods=['DELETE'])
@login_required
def delete_medication(medication_id):
    """Delete medication"""
    try:
        success = MedicationService.delete(medication_id, current_user.id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Medication not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Medication deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>/feed', methods=['POST'])
@login_required
def feed_medication(medication_id):
    """Provide AI reference 'feeding' for an existing medication"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'Image data required'}), 400
            
        medication = MedicationService.feed_medication(
            medication_id,
            current_user.id,
            data['image']
        )
        
        if not medication:
            return jsonify({'success': False, 'error': 'Medication not found or training failed'}), 404
            
        return jsonify({
            'success': True,
            'message': 'Neural training complete',
            'data': medication.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/medications/<int:medication_id>/mark-taken', methods=['POST'])
@login_required
def mark_medication_taken(medication_id):
    """Mark medication as taken"""
    try:
        data = request.json or {}
        
        log = MedicationService.mark_taken(
            medication_id=medication_id,
            user_id=current_user.id,
            verified=data.get('verified', False),
            verification_method=data.get('verification_method'),
            notes=data.get('notes')
        )
        
        return jsonify({
            'success': True,
            'message': 'Medication marked as taken',
            'data': log.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>/logs', methods=['GET'])
@login_required
def get_medication_logs(medication_id):
    """Get medication history logs"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        logs = MedicationService.get_medication_logs(
            medication_id,
            current_user.id,
            limit
        )
        
        return jsonify({
            'success': True,
            'count': len(logs),
            'data': [log.to_dict() for log in logs]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@api_v1.route('/medications/quick-test', methods=['POST'])
@login_required
def create_quick_test():
    """Create a test medication scheduled 2 minutes from now"""
    from datetime import date, datetime, timedelta
    from app.models.medication import Medication
    from app.extensions import db
    import json
    
    try:
        # Calculate 2 minutes from now
        now = datetime.now()
        future_time = now + timedelta(minutes=2)
        custom_time = future_time.strftime('%H:%M')
        
        # Get data from request
        data = request.get_json(silent=True) or {}
        name = data.get('name', 'Test Medication')
        dosage = data.get('dosage', '100mg')
        
        # Create medication for current user
        medication = Medication(
            user_id=current_user.id,
            name=name,
            dosage=dosage,
            frequency='Custom',
            custom_reminder_times=json.dumps([custom_time]),
            instructions='🧪 Quick Test',
            priority='normal',
            start_date=date.today(),
            morning=False,
            afternoon=False,
            evening=False,
            night=False
        )
        
        db.session.add(medication)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'✅ Created! Reminder at {custom_time}',
            'medication_id': medication.id,
            'scheduled_time': custom_time
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medication-status', methods=['GET'])
@login_required
def get_medication_status():
    """Get today's medication status for voice assistant queries.
    
    Returns:
        - taken: medications already taken today
        - missed: medications past their scheduled time but not taken
        - upcoming: medications still scheduled for today
    """
    from datetime import datetime, date
    from app.models.medication import Medication
    from app.models.medication_log import MedicationLog
    
    try:
        today = date.today()
        now = datetime.now()
        current_time = now.strftime('%H:%M')
        
        senior_id = request.args.get('senior_id', type=int)
        user_id = current_user.id
        
        # Security: If senior_id is provided, verify current user is a linked caregiver
        if senior_id and senior_id != current_user.id:
            from app.models.relationship import CaregiverSenior
            from app.services.audit_service import audit_service
            relationship = CaregiverSenior.query.filter_by(
                caregiver_id=current_user.id,
                senior_id=senior_id
            ).first()
            if not relationship:
                return jsonify({'success': False, 'error': 'Access denied to this senior\'s data'}), 403
            
            # Audit log for sensitive data access
            audit_service.log_action(
                user_id=current_user.id,
                action='view_senior_dashboard',
                target_id=senior_id,
                details=f"Caregiver accessed dashboard for senior ID {senior_id}"
            )
            user_id = senior_id
            
        # Get user's active medications
        medications = Medication.query.filter_by(
            user_id=user_id
        ).filter(
            (Medication.start_date.is_(None)) | (Medication.start_date <= today)
        ).filter(
            (Medication.end_date.is_(None)) | (Medication.end_date >= today)
        ).all()
        
        # New independent dose instance logic
        all_dose_slots = []
        for med in medications:
            times = med.get_reminder_times() if hasattr(med, 'get_reminder_times') else []
            if not times:
                # Anytime medication - one slot per day
                all_dose_slots.append({
                    'id': med.id, 'name': med.name, 'dosage': med.dosage,
                    'time': 'Anytime', 'sort_time': '23:59'
                })
            else:
                for t in times:
                    all_dose_slots.append({
                        'id': med.id, 'name': med.name, 'dosage': med.dosage,
                        'time': t, 'sort_time': t
                    })
        
        # Get all logs from today
        logs_today = MedicationLog.query.filter(
            MedicationLog.user_id == user_id,
            MedicationLog.taken_at >= datetime.combine(today, datetime.min.time())
        ).order_by(MedicationLog.taken_at.asc()).all()
        
        print(f"DEBUG: [API] User {user_id} has {len(all_dose_slots)} slots and {len(logs_today)} logs today", file=sys.stderr)
        
        # Group logs by medication for greedy matching
        logs_by_med = {}
        for log in logs_today:
            mid = log.medication_id
            if mid not in logs_by_med: logs_by_med[mid] = []
            logs_by_med[mid].append(log)
            
        taken = []
        skipped = []
        missed = []
        upcoming = []
        
        # Process each medication's slots
        med_ids = set(slot['id'] for slot in all_dose_slots)
        for med_id in med_ids:
            med_slots = [s for s in all_dose_slots if s['id'] == med_id]
            med_slots.sort(key=lambda x: x['sort_time'])
            
            med_logs = logs_by_med.get(med_id, [])
            
            for i, slot in enumerate(med_slots):
                if i < len(med_logs):
                    # Match this slot to a log
                    log = med_logs[i]
                    log_data = {
                        'id': slot['id'], 'name': slot['name'],
                        'dosage': slot['dosage'], 'time': slot['time']
                    }
                    if log.taken_correctly:
                        log_data['taken_at'] = log.taken_at.strftime('%H:%M')
                        taken.append(log_data)
                    else:
                        log_data['skipped_at'] = log.taken_at.strftime('%H:%M')
                        skipped.append(log_data)
                else:
                    # No log for this slot
                    if slot['time'] == 'Anytime':
                        upcoming.append(slot)
                    elif slot['time'] <= current_time:
                        print(f"DEBUG: [API] Marking slot {slot['name']} @ {slot['time']} as MISSED", file=sys.stderr)
                        missed.append({
                            'id': slot['id'], 'name': slot['name'],
                            'dosage': slot['dosage'], 'scheduled_time': slot['time']
                        })
                    else:
                        upcoming.append(slot)

        # Final sorting for the UI
        upcoming.sort(key=lambda x: x['sort_time'])
        missed.sort(key=lambda x: x['scheduled_time'], reverse=True)
        taken.sort(key=lambda x: x['taken_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'taken': taken,
            'skipped': skipped,
            'missed': missed,
            'upcoming': upcoming,
            'total_today': len(all_dose_slots)
        }), 200
        
    except Exception as e:
        print(f"❌ [API] Critical error in get_medication_status: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/notify-caregiver', methods=['POST'])
@login_required
def notify_caregiver():
    """Notify linked caregiver via available channels.
    
    Used by voice command "Call caregiver".
    """
    from app.models.relationship import CaregiverSenior
    from app.services import notification_service
    
    try:
        # Find linked caregiver
        relationship = CaregiverSenior.query.filter_by(
            senior_id=current_user.id,
            status='accepted'
        ).first()
        
        if not relationship:
            return jsonify({
                'success': False,
                'message': 'No linked caregiver found'
            }), 200
        
        caregiver = relationship.caregiver
        
        # Send notification
        notification_service.send_notification(
            user=caregiver,
            title='MedGuardian Alert',
            message=f'{current_user.username} is trying to reach you via voice command.',
            notification_type='caregiver_alert',
            priority='high'
        )
        
        return jsonify({
            'success': True,
            'caregiver_name': caregiver.username,
            'message': 'Caregiver notified successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>/skip', methods=['POST'])
@login_required
def skip_medication(medication_id):
    """Skip a medication for today"""
    try:
        log = MedicationService.skip(
            medication_id=medication_id,
            user_id=current_user.id
        )
        
        return jsonify({
            'success': True,
            'message': 'Medication marked as skipped for today',
            'data': log.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_v1.route('/medications/check-interactions', methods=['POST'])
@login_required
def check_interactions_api():
    """Verify potential interactions for a candidate medication"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({'error': 'Medication name required'}), 400
        
    senior_id = data.get('senior_id') or current_user.id
    candidate_name = data['name']
    
    # Get existing meds for this user
    from app.models.medication import Medication
    from app.models.relationship import CaregiverSenior
    
    # Security check: if senior_id, verify relationship
    if senior_id != current_user.id:
        rel = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=senior_id,
            status='accepted'
        ).first()
        if not rel:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

    existing_meds = Medication.query.filter_by(user_id=senior_id).all()
    existing_names = [m.name for m in existing_meds]
    
    from app.services.medication_interaction_service import medication_interaction_service
    conflicts = medication_interaction_service.check_interactions(candidate_name, existing_names)
    
    return jsonify({
        'success': True,
        'conflicts': conflicts
    })




