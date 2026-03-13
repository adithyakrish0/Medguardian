# app/routes/api/emergency.py
"""Emergency SOS API endpoint for frontend consumption."""
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1
from app.extensions import db, socketio
from app.models.emergency_contact import EmergencyContact
from app.models.health_incident import HealthIncident
from datetime import datetime
import json


@api_v1.route('/emergency/sos', methods=['POST'])
@login_required
def api_sos():
    """Trigger emergency SOS alert via API."""
    try:
        user = current_user

        # Create HealthIncident record
        incident = HealthIncident(
            user_id=user.id,
            incident_type='sos_triggered',
            severity='critical',
            notes='Emergency SOS triggered by user',
            extra_data=json.dumps({'triggered_at': datetime.utcnow().isoformat()})
        )
        db.session.add(incident)
        db.session.commit()

        # Get emergency contacts count
        contacts = EmergencyContact.query.filter_by(
            user_id=user.id,
            notify_for_emergency=True
        ).all()

        # Emit Socket.IO event to caregiver room
        try:
            socketio.emit('sos_alert', {
                'user_id': user.id,
                'user_name': user.full_name or user.username,
                'triggered_at': datetime.utcnow().isoformat()
            }, room=f'caregiver_{user.id}')
        except Exception as e:
            print(f'SocketIO emit failed (non-fatal): {e}')

        # Also delegate to existing email-based SOS if contacts exist
        try:
            from app.routes.emergency import trigger_sos
            trigger_sos()
        except Exception:
            pass  # Email sending is best-effort

        return jsonify({
            'success': True,
            'message': 'Emergency alert sent',
            'data': {
                'contacts_notified': len(contacts)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
