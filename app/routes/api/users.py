"""API v1 - User endpoints"""
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1


@api_v1.route('/users/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user profile"""
    try:
        return jsonify({
            'success': True,
            'data': current_user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    from app.vision.model_manager import model_manager
    
    model_info = model_manager.get_model_info()
    
    return jsonify({
        'status': 'healthy',
        'version': 'v1',
        'features': {
            'yolo_loaded': model_info['yolo_loaded'],
            'tesseract_available': model_info['tesseract_available'],
            'device': model_info['device']
        }
    }), 200

@api_v1.route('/users/audit-logs', methods=['GET'])
@api_v1.route('/users/audit-logs/<int:target_user_id>', methods=['GET'])
@login_required
def get_audit_logs(target_user_id=None):
    """Get security and clinical audit logs"""
    from app.services.audit_service import audit_service
    from app.models.relationship import CaregiverSenior
    
    # Target ID for query
    query_id = target_user_id or current_user.id
    
    # Security check: if target_user_id, verify relationship
    if target_user_id and target_user_id != current_user.id:
        rel = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=target_user_id,
            status='accepted'
        ).first()
        if not rel:
            return jsonify({'success': False, 'message': 'Access denied'}), 403
            
    logs = audit_service.get_logs_for_user(query_id)
    return jsonify({
        'success': True,
        'logs': [l.to_dict() for l in logs]
    })

