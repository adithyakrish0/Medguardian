
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1
from app.extensions import db
from app.models.relationship import CaregiverSenior

@api_v1.route('/senior/connection-requests', methods=['GET'])
@login_required
def get_connection_requests():
    """Get all pending connection requests for the current senior"""
    if current_user.role != 'senior':
        return jsonify({'success': False, 'message': 'Only seniors can view connection requests'}), 403
        
    requests = CaregiverSenior.query.filter_by(
        senior_id=current_user.id,
        status='pending'
    ).all()
    
    data = []
    for req in requests:
        data.append({
            'id': req.id,
            'caregiver_name': req.caregiver.username,
            'caregiver_id': req.caregiver_id,
            'requested_at': req.added_at.isoformat(),
            'notes': req.notes
        })
        
    return jsonify({
        'success': True,
        'requests': data
    })

@api_v1.route('/senior/connection-requests/<int:req_id>/respond', methods=['POST'])
@login_required
def respond_to_request(req_id):
    """Approve or decline a caregiver connection request"""
    if current_user.role != 'senior':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
        
    rel = CaregiverSenior.query.filter_by(
        id=req_id,
        senior_id=current_user.id
    ).first()
    
    if not rel:
        return jsonify({'success': False, 'message': 'Request not found'}), 404
        
    data = request.get_json()
    action = data.get('action') # 'accept' or 'reject'
    
    if action == 'accept':
        rel.status = 'accepted'
        db.session.commit()
        return jsonify({'success': True, 'message': f'You have accepted {rel.caregiver.username} as your caregiver.'})
    elif action == 'reject':
        rel.status = 'rejected'
        db.session.commit()
        # We keep the record as 'rejected' for history, or we could delete it.
        # Let's keep it for now.
        return jsonify({'success': True, 'message': f'You have declined the request from {rel.caregiver.username}.'})
    else:
        return jsonify({'success': False, 'message': 'Invalid action'}), 400
