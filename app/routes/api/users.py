"""API v1 - User endpoints"""
import sys
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1


@api_v1.route('/users/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user profile"""
    try:
        user_data = current_user.to_dict()
        user_data.pop('password_hash', None)
        return jsonify({
            'success': True,
            'data': user_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/users/<int:user_id>', methods=['GET'])
@login_required
def get_user_by_id(user_id):
    """Get user profile by ID (if authorized)"""
    from app.models.auth import User
    from app.models.relationship import CaregiverSenior
    
    print(f"DEBUG: get_user_by_id called for ID: {user_id}", file=sys.stderr)
    try:
        # Security: Only allow self or linked caregiver/senior (accepted status)
        if user_id != current_user.id:
            print(f"DEBUG: Checking relationship between {current_user.id} and {user_id}", file=sys.stderr)
            relationship = CaregiverSenior.query.filter(
                ((CaregiverSenior.caregiver_id == current_user.id) & (CaregiverSenior.senior_id == user_id)) |
                ((CaregiverSenior.caregiver_id == user_id) & (CaregiverSenior.senior_id == current_user.id))
            ).filter_by(status='accepted').first()
            
            if not relationship:
                print(f"DEBUG: Access denied. No relationship found.", file=sys.stderr)
                return jsonify({'success': False, 'error': 'Access denied to this user profile'}), 403
                
        print(f"DEBUG: Querying user {user_id}", file=sys.stderr)
        user = User.query.get(user_id)
        if not user:
             print(f"DEBUG: User {user_id} NOT FOUND in database", file=sys.stderr)
             return jsonify({'success': False, 'error': 'User not found'}), 404
             
        user_data = user.to_dict()
        
        # Remove sensitive fields
        sensitive_fields = ['password_hash', 'reset_token', 'reset_token_expiry', 
                          'email_verification_token', 'email_verified']
        for field in sensitive_fields:
            user_data.pop(field, None)
            
        return jsonify({
            'success': True,
            'data': user_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


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

