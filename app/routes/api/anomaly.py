"""API v1 - Anomaly Detection Endpoints

Provides medication adherence anomaly detection:
- Train baseline models for patients
- Detect anomalies in recent behavior
- Configure detection sensitivity
- Demo trigger for live presentations
"""

from flask import jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from . import api_v1
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.ml.anomaly_detector import anomaly_detector, Sensitivity
from app.extensions import db, socketio
import logging

logger = logging.getLogger(__name__)


def _get_patient_logs(patient_id: int, days: int = 180):
    """Helper to fetch medication logs for a patient."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    logs = MedicationLog.query.filter(
        MedicationLog.user_id == patient_id,
        MedicationLog.taken_at >= cutoff
    ).order_by(MedicationLog.taken_at.asc()).all()
    
    return [log.to_dict() for log in logs]


def _verify_access(patient_id: int) -> bool:
    """Verify current user has access to patient data."""
    if current_user.id == patient_id:
        return True
    
    # Check caregiver relationship
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=patient_id,
        status='accepted'
    ).first()
    
    return relationship is not None


@api_v1.route('/anomaly/train', methods=['POST'])
@login_required
def train_anomaly_baseline():
    """
    Train a baseline model for anomaly detection.
    
    Input: {"patient_id": 123, "sensitivity": "medium"}
    Output: {"model_saved": true, "threshold": 2.5, "training_samples": 180}
    """
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id', current_user.id)
        sensitivity_str = data.get('sensitivity', 'medium')
        
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Map sensitivity string to enum
        sensitivity_map = {
            'high': Sensitivity.HIGH,
            'medium': Sensitivity.MEDIUM,
            'low': Sensitivity.LOW
        }
        sensitivity = sensitivity_map.get(sensitivity_str.lower(), Sensitivity.MEDIUM)
        
        # Get historical logs (6 months)
        logs = _get_patient_logs(patient_id, days=180)
        
        if len(logs) < 7:
            return jsonify({
                'success': False,
                'error': f'Insufficient data: need at least 7 days, found {len(logs)}',
                'suggestion': 'Generate synthetic data first or wait for more adherence history'
            }), 400
        
        # Train baseline
        baseline = anomaly_detector.train(patient_id, logs, sensitivity)
        
        return jsonify({
            'success': True,
            'model_saved': True,
            'patient_id': patient_id,
            'threshold': baseline.sensitivity.value,
            'sensitivity': baseline.sensitivity.name.lower(),
            'training_samples': baseline.sample_count,
            'baseline': baseline.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error training anomaly baseline: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/anomaly/detect', methods=['POST'])
@login_required
def detect_anomaly():
    """
    Run anomaly detection on recent medication logs.
    
    Input: {"patient_id": 123} or {"patient_id": 123, "recent_logs": [...]}
    Output: {"is_anomaly": true, "anomaly_score": 3.2, "anomaly_type": "unusual_timing", "alert": "..."}
    """
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id', current_user.id)
        recent_logs = data.get('recent_logs')
        
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get recent logs if not provided
        if recent_logs is None:
            recent_logs = _get_patient_logs(patient_id, days=7)
        
        # Run detection
        result = anomaly_detector.detect(patient_id, recent_logs)
        
        response = {
            'success': True,
            'patient_id': patient_id,
            **result.to_dict()
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error detecting anomaly: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/anomaly/history/<int:patient_id>', methods=['GET'])
@login_required
def get_anomaly_history(patient_id: int):
    """
    Get anomaly detection history for a patient.
    
    Output: {"anomalies": [{date, type, score, description}]}
    """
    try:
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # For MVP, we'll run detection and return results
        # In production, you'd store anomaly history in a table
        recent_logs = _get_patient_logs(patient_id, days=30)
        
        # Get baseline info
        baseline = anomaly_detector.get_baseline(patient_id)
        
        if not baseline:
            return jsonify({
                'success': True,
                'patient_id': patient_id,
                'has_baseline': False,
                'anomalies': [],
                'message': 'No baseline model found. Train first.'
            }), 200
        
        # Run current detection
        result = anomaly_detector.detect(patient_id, recent_logs[-7:] if len(recent_logs) >= 7 else recent_logs)
        
        anomalies = []
        if result.is_anomaly:
            anomalies.append({
                'date': result.detected_at.isoformat(),
                'type': result.anomaly_type,
                'score': result.anomaly_score,
                'description': result.alert_message
            })
        
        return jsonify({
            'success': True,
            'patient_id': patient_id,
            'has_baseline': True,
            'baseline': baseline.to_dict(),
            'anomalies': anomalies,
            'logs_analyzed': len(recent_logs)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting anomaly history: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/anomaly/configure', methods=['POST'])
@login_required
def configure_anomaly_sensitivity():
    """
    Configure detection sensitivity for a patient.
    
    Input: {"patient_id": 123, "sensitivity": "high"|"medium"|"low"}
    Maps to Z-score thresholds: high=2.0, medium=2.5, low=3.0
    """
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id', current_user.id)
        sensitivity = data.get('sensitivity', 'medium')
        
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Validate sensitivity
        if sensitivity.lower() not in ['high', 'medium', 'low']:
            return jsonify({
                'success': False,
                'error': 'Invalid sensitivity. Use: high, medium, or low'
            }), 400
        
        # Update sensitivity
        success = anomaly_detector.configure_sensitivity(patient_id, sensitivity)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'No baseline found for this patient. Train first.'
            }), 404
        
        # Get updated baseline
        baseline = anomaly_detector.get_baseline(patient_id)
        
        return jsonify({
            'success': True,
            'patient_id': patient_id,
            'sensitivity': sensitivity.lower(),
            'threshold': baseline.sensitivity.value,
            'message': f'Sensitivity updated to {sensitivity}'
        }), 200
        
    except Exception as e:
        logger.error(f"Error configuring sensitivity: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/anomaly/trigger-demo/<int:patient_id>', methods=['GET'])
@login_required
def trigger_demo_detection(patient_id: int):
    """
    Demo trigger - immediately runs detection and sends Socket.IO alert.
    
    For live demos, bypasses the 2 AM cron job.
    Returns detection result AND emits 'anomaly_alert' to caregiver room.
    """
    try:
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get recent logs
        recent_logs = _get_patient_logs(patient_id, days=7)
        
        # Check if baseline exists, auto-train if not
        baseline = anomaly_detector.get_baseline(patient_id)
        if not baseline:
            # Auto-train with all available data
            all_logs = _get_patient_logs(patient_id, days=180)
            if len(all_logs) >= 7:
                anomaly_detector.train(patient_id, all_logs)
                logger.info(f"Auto-trained baseline for demo: patient {patient_id}")
            else:
                return jsonify({
                    'success': False,
                    'error': 'Insufficient data for baseline. Need at least 7 days.'
                }), 400
        
        # Run detection
        result = anomaly_detector.detect(patient_id, recent_logs)
        
        # Get patient info for alert
        from app.models.user import User
        patient = User.query.get(patient_id)
        patient_name = patient.username if patient else f"Patient {patient_id}"
        
        # Emit Socket.IO alert if anomaly detected
        if result.is_anomaly:
            # Find caregiver(s) for this patient
            relationships = CaregiverSenior.query.filter_by(
                senior_id=patient_id,
                status='accepted'
            ).all()
            
            for rel in relationships:
                alert_payload = {
                    'patient_id': patient_id,
                    'patient_name': patient_name,
                    'anomaly_type': result.anomaly_type,
                    'anomaly_score': round(result.anomaly_score, 2),
                    'alert_message': result.alert_message,
                    'details': result.details,
                    'detected_at': result.detected_at.isoformat(),
                    'action_required': True
                }
                
                socketio.emit(
                    'anomaly_alert',
                    alert_payload,
                    room=f'user_{rel.caregiver_id}'
                )
                logger.info(f"Sent anomaly alert to caregiver {rel.caregiver_id}")
        
        return jsonify({
            'success': True,
            'demo_mode': True,
            'patient_id': patient_id,
            'patient_name': patient_name,
            'alert_sent': result.is_anomaly,
            **result.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in demo trigger: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/anomaly/batch-detect', methods=['POST'])
@login_required
def batch_detect_anomalies():
    """
    Run anomaly detection for all patients (admin/scheduler use).
    
    This is what the nightly cron job calls.
    Returns list of patients with detected anomalies.
    """
    try:
        # This should be restricted to admin/scheduler
        # For MVP, allow any authenticated user
        
        def get_logs_for_patient(patient_id):
            return _get_patient_logs(patient_id, days=7)
        
        results = anomaly_detector.detect_for_all_patients(get_logs_for_patient)
        
        # Send Socket.IO alerts for each anomaly
        alerts_sent = 0
        for result in results:
            patient_id = result.details.get('baseline', {}).get('patient_id')
            if patient_id:
                relationships = CaregiverSenior.query.filter_by(
                    senior_id=patient_id,
                    status='accepted'
                ).all()
                
                for rel in relationships:
                    socketio.emit(
                        'anomaly_alert',
                        result.to_dict(),
                        room=f'user_{rel.caregiver_id}'
                    )
                    alerts_sent += 1
        
        return jsonify({
            'success': True,
            'patients_checked': len(results),
            'anomalies_found': sum(1 for r in results if r.is_anomaly),
            'alerts_sent': alerts_sent,
            'results': [r.to_dict() for r in results]
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch detection: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
