"""Safety Monitoring Routes - Fall Detection & Inactivity Monitoring"""
import json
from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from app.extensions import db
from datetime import datetime

safety = Blueprint('safety', __name__, url_prefix='/safety')


def get_user_preferences():
    """Get user preferences as dict (handles JSON decoding)"""
    if current_user.preferences:
        try:
            return json.loads(current_user.preferences)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def save_user_preferences(prefs):
    """Save user preferences (handles JSON encoding)"""
    current_user.preferences = json.dumps(prefs)
    db.session.commit()


@safety.route('/')
@login_required
def settings():
    """Safety monitoring settings page"""
    from app.models.health_incident import HealthIncident
    
    prefs = get_user_preferences()
    
    safety_settings = {
        'fall_detection_enabled': prefs.get('fall_detection', False),
        'inactivity_monitoring_enabled': prefs.get('inactivity_monitoring', False),
        'inactivity_threshold_minutes': prefs.get('inactivity_threshold', 120),
    }
    
    # Get recent incidents
    recent_incidents = HealthIncident.query.filter_by(
        user_id=current_user.id
    ).order_by(HealthIncident.detected_at.desc()).limit(10).all()
    
    return render_template('safety/settings.html',
                           safety_settings=safety_settings,
                           recent_incidents=recent_incidents)


@safety.route('/toggle-fall-detection', methods=['POST'])
@login_required
def toggle_fall_detection():
    """Toggle fall detection on/off"""
    from app.services.safety_monitoring_service import fall_detection_service
    
    try:
        data = request.get_json() or {}
        enabled = data.get('enabled', False)
        
        # Update user preferences
        prefs = get_user_preferences()
        prefs['fall_detection'] = enabled
        save_user_preferences(prefs)
        
        # Start/stop the service
        if enabled:
            fall_detection_service.start_monitoring(current_user.id)
            message = 'Fall detection enabled'
        else:
            fall_detection_service.stop_monitoring()
            message = 'Fall detection disabled'
        
        return jsonify({'success': True, 'message': message, 'enabled': enabled})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@safety.route('/toggle-inactivity-monitor', methods=['POST'])
@login_required
def toggle_inactivity_monitor():
    """Toggle inactivity monitoring on/off"""
    from app.services.safety_monitoring_service import inactivity_monitor
    
    try:
        data = request.get_json() or {}
        enabled = data.get('enabled', False)
        threshold = data.get('threshold_minutes', 120)
        
        # Update user preferences
        prefs = get_user_preferences()
        prefs['inactivity_monitoring'] = enabled
        prefs['inactivity_threshold'] = threshold
        save_user_preferences(prefs)
        
        # Start/stop the service
        if enabled:
            inactivity_monitor.start_monitoring(current_user.id)
            message = f'Inactivity monitoring enabled ({threshold} min threshold)'
        else:
            message = 'Inactivity monitoring disabled'
        
        return jsonify({'success': True, 'message': message, 'enabled': enabled})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@safety.route('/incidents')
@login_required
def incidents():
    """View all safety incidents"""
    from app.models.health_incident import HealthIncident
    
    incidents = HealthIncident.query.filter_by(
        user_id=current_user.id
    ).order_by(HealthIncident.detected_at.desc()).all()
    
    return render_template('safety/incidents.html', incidents=incidents)


@safety.route('/incidents/<int:incident_id>/resolve', methods=['POST'])
@login_required
def resolve_incident(incident_id):
    """Resolve a safety incident"""
    from app.models.health_incident import HealthIncident
    
    try:
        incident = HealthIncident.query.filter_by(
            id=incident_id,
            user_id=current_user.id
        ).first()
        
        if not incident:
            return jsonify({'success': False, 'error': 'Incident not found'}), 404
        
        data = request.get_json() or {}
        incident.status = 'resolved'
        incident.resolved_at = datetime.utcnow()
        incident.notes = data.get('notes', '')
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Incident resolved'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@safety.route('/api/status')
@login_required
def api_status():
    """Get current safety monitoring status"""
    from app.services.safety_monitoring_service import fall_detection_service, inactivity_monitor
    
    return jsonify({
        'fall_detection': {
            'enabled': fall_detection_service.is_monitoring,
            'active_user': fall_detection_service.current_user_id if hasattr(fall_detection_service, 'current_user_id') else None
        },
        'inactivity_monitor': {
            'enabled': inactivity_monitor.is_monitoring
        }
    })
