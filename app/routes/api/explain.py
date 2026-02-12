"""API v1 - Explainability Endpoints

Provides SHAP-based explanations for adherence predictions:
- Individual prediction explanations with waterfall plots
- Global feature importance analysis
- Side-by-side comparison of high vs low risk
"""

from flask import jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from . import api_v1
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.ml.explainer import get_explainer
from app.services.prediction_service import prediction_service
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


def _get_patient_features(patient_id: int) -> dict:
    """
    Extract representative features for a patient based on their medication schedule.
    Uses the most common dosing time and medication priority.
    """
    # Get recent medication logs
    cutoff = datetime.utcnow() - timedelta(days=30)
    logs = MedicationLog.query.filter(
        MedicationLog.user_id == patient_id,
        MedicationLog.scheduled_time >= cutoff
    ).order_by(MedicationLog.scheduled_time.desc()).limit(50).all()
    
    if not logs:
        # Default features
        return {
            'hour': 9,
            'day_of_week': datetime.utcnow().weekday(),
            'is_weekend': 1 if datetime.utcnow().weekday() >= 5 else 0,
            'priority': 0
        }
    
    # Calculate average hour
    hours = [log.scheduled_time.hour for log in logs if log.scheduled_time]
    avg_hour = round(sum(hours) / len(hours)) if hours else 9
    
    # Check for high priority medications
    has_high_priority = any(
        log.medication and log.medication.priority == 'high' 
        for log in logs
    )
    
    # Current day
    now = datetime.utcnow()
    
    return {
        'hour': avg_hour,
        'day_of_week': now.weekday(),
        'is_weekend': 1 if now.weekday() >= 5 else 0,
        'priority': 1 if has_high_priority else 0
    }


@api_v1.route('/explain/prediction/<int:patient_id>', methods=['GET'])
@login_required
def explain_prediction(patient_id: int):
    """
    Get SHAP explanation for a patient's adherence prediction.
    
    Output: {
        "prediction": 0.73,
        "risk_level": "Medium",
        "contributions": [
            {"name": "Scheduled Hour", "value": 9, "contribution": 0.15},
            ...
        ],
        "waterfall_plot": "data:image/png;base64,..."
    }
    """
    try:
        # Verify access
        if not _verify_access(patient_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get explainer
        explainer = get_explainer()
        if not explainer.model:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Train the adherence model first.',
                'suggestion': 'Run: python app/scripts/train_ml_pipeline.py'
            }), 503
        
        # Get patient features
        features = _get_patient_features(patient_id)
        
        # Generate explanation
        explanation = explainer.explain_prediction(features, generate_plot=True)
        
        return jsonify({
            'success': True,
            'patient_id': patient_id,
            'features_used': features,
            **explanation.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error explaining prediction: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/explain/medication/<int:medication_id>', methods=['GET'])
@login_required
def explain_medication_prediction(medication_id: int):
    """
    Get SHAP explanation for a specific medication's prediction.
    Uses the medication's next scheduled time.
    """
    try:
        medication = Medication.query.get(medication_id)
        if not medication:
            return jsonify({'success': False, 'error': 'Medication not found'}), 404
        
        # Verify access
        if not _verify_access(medication.user_id):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get explainer
        explainer = get_explainer()
        if not explainer.model:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 503
        
        # Build features from medication
        now = datetime.utcnow()
        
        # Parse schedule to get hour (simplified)
        hour = 9  # Default
        if medication.schedule:
            try:
                if ':' in str(medication.schedule):
                    hour = int(str(medication.schedule).split(':')[0])
            except:
                pass
        
        features = {
            'hour': hour,
            'day_of_week': now.weekday(),
            'is_weekend': 1 if now.weekday() >= 5 else 0,
            'priority': 1 if medication.priority == 'high' else 0
        }
        
        explanation = explainer.explain_prediction(features, generate_plot=True)
        
        return jsonify({
            'success': True,
            'medication_id': medication_id,
            'medication_name': medication.name,
            'features_used': features,
            **explanation.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error explaining medication prediction: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/explain/global', methods=['GET'])
@login_required
def get_global_explanation():
    """
    Get global feature importance across all predictions.
    
    Output: {
        "features": [
            {"rank": 1, "feature": "Scheduled Hour", "importance": 0.35, "percentage": 40.2},
            ...
        ],
        "summary_plot": "data:image/png;base64,..."
    }
    """
    try:
        explainer = get_explainer()
        if not explainer.model:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 503
        
        n_samples = request.args.get('samples', 200, type=int)
        n_samples = min(max(n_samples, 50), 500)  # Clamp between 50-500
        
        result = explainer.get_global_importance(n_samples)
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting global explanation: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/explain/compare', methods=['POST'])
@login_required
def compare_predictions():
    """
    Compare SHAP explanations for two scenarios.
    
    Input: {
        "high_risk": {"hour": 6, "day_of_week": 6, "is_weekend": 1, "priority": 0},
        "low_risk": {"hour": 9, "day_of_week": 1, "is_weekend": 0, "priority": 1}
    }
    
    Output: Side-by-side comparison with key differences
    """
    try:
        data = request.get_json() or {}
        
        high_risk_features = data.get('high_risk', {
            'hour': 6,
            'day_of_week': 6,
            'is_weekend': 1,
            'priority': 0
        })
        
        low_risk_features = data.get('low_risk', {
            'hour': 9,
            'day_of_week': 1,
            'is_weekend': 0,
            'priority': 1
        })
        
        explainer = get_explainer()
        if not explainer.model:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 503
        
        result = explainer.compare_predictions(high_risk_features, low_risk_features)
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        logger.error(f"Error comparing predictions: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/explain/status', methods=['GET'])
@login_required
def get_explainer_status():
    """Check if the explainer is ready."""
    try:
        explainer = get_explainer()
        
        return jsonify({
            'success': True,
            'model_loaded': explainer.model is not None,
            'explainer_ready': explainer.explainer is not None,
            'features': explainer.FEATURE_NAMES if explainer.model else [],
            'model_type': type(explainer.model).__name__ if explainer.model else None
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
