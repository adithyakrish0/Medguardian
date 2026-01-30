from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1
from app.services.analytics_service import analytics_service
from app.models.relationship import CaregiverSenior

@api_v1.route('/analytics/adherence', methods=['GET'])
@api_v1.route('/analytics/adherence/<int:senior_id>', methods=['GET'])
@login_required
def get_adherence(senior_id=None):
    """Get adherence history for self or a managed senior"""
    target_id = senior_id or current_user.id
    days = request.args.get('days', 7, type=int)
    
    # Security check: if senior_id, verify relationship
    if senior_id and senior_id != current_user.id:
        rel = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=senior_id,
            status='accepted'
        ).first()
        if not rel:
            return jsonify({'success': False, 'message': 'Access denied'}), 403
            
    try:
        data = analytics_service.get_adherence_history(target_id, days)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_v1.route('/analytics/fleet', methods=['GET'])
@login_required
def get_fleet_analytics():
    """Get risk assessment and analytics for the entire fleet"""
    if current_user.role != 'caregiver':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
        
    try:
        data = analytics_service.get_fleet_analytics(current_user.id)
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
