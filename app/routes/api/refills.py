"""API v1 - Refill Alert Endpoints

Provides medication refill prediction and alert management:
- Predict depletion dates for medications
- Generate and manage refill alerts
- Update quantities after refill
"""

from flask import jsonify, request
from flask_login import login_required, current_user
from datetime import datetime
from . import api_v1
from app.models.medication import Medication
from app.models.refill_alert import RefillAlert
from app.models.relationship import CaregiverSenior
from app.ml.refill_predictor import refill_predictor
from app.extensions import db, socketio
import logging

logger = logging.getLogger(__name__)


def _verify_access(patient_id: int) -> bool:
    """Verify current user has access to patient data."""
    if current_user.id == patient_id:
        return True
    
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=patient_id,
        status='accepted'
    ).first()
    
    return relationship is not None


def _get_patient_caregivers(patient_id: int) -> list:
    """Get all caregiver IDs for a patient."""
    relationships = CaregiverSenior.query.filter_by(
        senior_id=patient_id,
        status='accepted'
    ).all()
    return [r.caregiver_id for r in relationships]


@api_v1.route('/refills/predictions/<int:patient_id>', methods=['GET'])
@login_required
def get_refill_predictions(patient_id: int):
    """
    Get refill predictions for all medications of a patient.
    
    Output: {
        "patient_id": 123,
        "medications": [
            {
                "medication_id": 1,
                "name": "Aspirin 81mg",
                "quantity_remaining": 15,
                "days_remaining": 15,
                "predicted_depletion_date": "2025-03-01",
                "alert_level": "info"
            }
        ],
        "total_alerts": 2
    }
    """
    try:
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        predictions = refill_predictor.predict_for_patient(patient_id)
        
        return jsonify({
            'success': True,
            **predictions
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting refill predictions: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/trigger-check', methods=['POST'])
@login_required
def trigger_refill_check():
    """
    Trigger refill check for a patient and create alerts.
    
    Input: {"patient_id": 123}
    Output: {
        "alerts_generated": 2,
        "medications_checked": 5,
        "alerts": [...]
    }
    """
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id')
        
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id required'}), 400
        
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get predictions
        predictions = refill_predictor.predict_for_patient(patient_id)
        
        # Create alerts
        created_alerts = refill_predictor.check_and_create_alerts(patient_id)
        
        # Send Socket.IO notifications for new alerts
        if created_alerts:
            caregiver_ids = _get_patient_caregivers(patient_id)
            for cg_id in caregiver_ids:
                socketio.emit(
                    'refill_alert',
                    {
                        'patient_id': patient_id,
                        'alerts': created_alerts,
                        'timestamp': datetime.utcnow().isoformat()
                    },
                    room=f'user_{cg_id}'
                )
        
        return jsonify({
            'success': True,
            'medications_checked': len(predictions['medications']),
            'alerts_generated': len(created_alerts),
            'alerts': created_alerts
        }), 200
        
    except Exception as e:
        logger.error(f"Error triggering refill check: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/alerts/<int:patient_id>', methods=['GET'])
@login_required
def get_refill_alerts(patient_id: int):
    """
    Get all refill alerts for a patient.
    
    Output: {
        "active_alerts": [...],
        "alert_history": [...],
        "total_active": 2,
        "total_acknowledged": 15
    }
    """
    try:
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Active alerts
        active = RefillAlert.query.filter(
            RefillAlert.patient_id == patient_id,
            RefillAlert.acknowledged == False,
            RefillAlert.auto_resolved == False
        ).order_by(RefillAlert.days_remaining.asc()).all()
        
        # Historical alerts (last 30 days)
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        history = RefillAlert.query.filter(
            RefillAlert.patient_id == patient_id,
            RefillAlert.created_at >= cutoff,
            db.or_(
                RefillAlert.acknowledged == True,
                RefillAlert.auto_resolved == True
            )
        ).order_by(RefillAlert.created_at.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'active_alerts': [a.to_dict() for a in active],
            'alert_history': [a.to_dict() for a in history],
            'total_active': len(active),
            'total_acknowledged': len(history)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting refill alerts: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/acknowledge/<int:alert_id>', methods=['POST'])
@login_required
def acknowledge_refill_alert(alert_id: int):
    """
    Acknowledge a refill alert.
    
    Output: {"acknowledged": true}
    """
    try:
        alert = RefillAlert.query.get(alert_id)
        if not alert:
            return jsonify({'success': False, 'error': 'Alert not found'}), 404
        
        if not _verify_access(alert.patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        alert.acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'acknowledged': True,
            'alert_id': alert_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/update-quantity', methods=['POST'])
@login_required
def update_medication_quantity():
    """
    Update medication quantity (refill or manual adjustment).
    
    Input: {
        "medication_id": 1,
        "quantity_remaining": 90,
        "action": "refilled"  // or "adjusted"
    }
    
    Output: {"updated": true, "auto_acknowledged_alerts": 1}
    """
    try:
        data = request.get_json() or {}
        medication_id = data.get('medication_id')
        quantity = data.get('quantity_remaining')
        action = data.get('action', 'adjusted')
        
        if not medication_id or quantity is None:
            return jsonify({
                'success': False, 
                'error': 'medication_id and quantity_remaining required'
            }), 400
        
        medication = Medication.query.get(medication_id)
        if not medication:
            return jsonify({'success': False, 'error': 'Medication not found'}), 404
        
        if not _verify_access(medication.user_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if action == 'refilled':
            result = refill_predictor.handle_refill(medication_id, quantity)
        else:
            # Simple quantity update
            medication.quantity_remaining = quantity
            db.session.commit()
            result = {
                'success': True,
                'medication_id': medication_id,
                'new_quantity': quantity,
                'auto_resolved_alerts': 0
            }
        
        # Log the action
        logger.info(f"Medication {medication_id} quantity updated to {quantity} ({action}) by user {current_user.id}")
        
        # Mock pharmacy notification for demo
        if action == 'refilled':
            logger.info(f"[MOCK] Sent refill confirmation to pharmacy for medication {medication.name}")
        
        return jsonify({
            'success': True,
            'updated': True,
            **result
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating quantity: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/decrement/<int:medication_id>', methods=['POST'])
@login_required
def decrement_quantity(medication_id: int):
    """
    Decrement medication quantity by 1 (called when dose is taken).
    Used for automatic quantity tracking.
    
    Output: {"new_quantity": 14}
    """
    try:
        medication = Medication.query.get(medication_id)
        if not medication:
            return jsonify({'success': False, 'error': 'Medication not found'}), 404
        
        if not _verify_access(medication.user_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if medication.quantity_remaining is not None and medication.quantity_remaining > 0:
            medication.quantity_remaining -= 1
            db.session.commit()
        
        return jsonify({
            'success': True,
            'medication_id': medication_id,
            'new_quantity': medication.quantity_remaining
        }), 200
        
    except Exception as e:
        logger.error(f"Error decrementing quantity: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/refills/summary', methods=['GET'])
@login_required
def get_refill_summary():
    """
    Get summary of all refill alerts across all patients (for caregivers).
    
    Output: {
        "critical": 2,
        "warning": 3,
        "info": 1,
        "patients_with_alerts": [...]
    }
    """
    try:
        # Get all patients this user is caregiver for
        relationships = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            status='accepted'
        ).all()
        
        patient_ids = [r.senior_id for r in relationships]
        
        # Count alerts by level
        critical = 0
        warning = 0
        info = 0
        patients_with_alerts = []
        
        for pid in patient_ids:
            alerts = RefillAlert.get_active_for_patient(pid)
            if alerts:
                patient_data = {
                    'patient_id': pid,
                    'critical': sum(1 for a in alerts if a.alert_level == 'critical'),
                    'warning': sum(1 for a in alerts if a.alert_level == 'warning'),
                    'info': sum(1 for a in alerts if a.alert_level == 'info')
                }
                critical += patient_data['critical']
                warning += patient_data['warning']
                info += patient_data['info']
                patients_with_alerts.append(patient_data)
        
        return jsonify({
            'success': True,
            'critical': critical,
            'warning': warning,
            'info': info,
            'total': critical + warning + info,
            'patients_with_alerts': patients_with_alerts
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting refill summary: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
