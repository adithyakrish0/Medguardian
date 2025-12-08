"""API v1 - Medication endpoints"""
from flask import jsonify, request
from flask_login import login_required, current_user
from pydantic import ValidationError
from . import api_v1
from app.services import MedicationService
from app.utils.validators import MedicationCreateSchema, MedicationUpdateSchema


@api_v1.route('/medications', methods=['GET'])
@login_required
def get_medications():
    """Get all medications for current user"""
    try:
        medications = MedicationService.get_all_for_user(current_user.id)
        
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
