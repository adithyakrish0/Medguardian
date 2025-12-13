from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.snooze_log import SnoozeLog
from datetime import datetime, timedelta

snooze = Blueprint('snooze', __name__)

@snooze.route('/create-snooze', methods=['POST'])
@login_required
def create_snooze():
    """Create a new snooze record"""
    data = request.get_json()
    
    try:
        medication_id = data.get('medication_id')
        snooze_duration = data.get('snooze_duration_minutes', 5)
        original_time = data.get('original_medication_time')
        
        if not original_time:
            return jsonify({'success': False, 'message': 'Original medication time is required'}), 400
        
        # Parse the original time (for logging purposes)
        try:
            original_medication_time = datetime.fromisoformat(original_time.replace('Z', '+00:00'))
        except ValueError:
            # If parsing fails, use current time
            original_medication_time = datetime.now()
        
        # Calculate snooze until time - use LOCAL time for consistency with comparisons
        current_time = datetime.now()
        snooze_until = current_time + timedelta(minutes=snooze_duration)
        
        # Create snooze record
        snooze_log = SnoozeLog(
            user_id=current_user.id,
            medication_id=medication_id,
            original_medication_time=original_medication_time,
            snooze_until=snooze_until,
            snooze_duration_minutes=snooze_duration
        )
        
        db.session.add(snooze_log)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'snooze_id': snooze_log.id,
            'snooze_until': snooze_until.isoformat(),
            'message': f'Snoozed for {snooze_duration} minutes'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error creating snooze: {str(e)}'}), 500

@snooze.route('/get-active-snooze', methods=['GET'])
@login_required
def get_active_snooze():
    """Get the user's active snooze if any"""
    try:
        # Find the most recent snooze that hasn't expired
        now = datetime.now()  # Use local time consistently
        active_snooze = SnoozeLog.query.filter(
            SnoozeLog.user_id == current_user.id,
            SnoozeLog.snooze_until > now
        ).order_by(SnoozeLog.created_at.desc()).first()
        
        if active_snooze:
            return jsonify({
                'success': True,
                'snooze_id': active_snooze.id,
                'snooze_until': active_snooze.snooze_until.isoformat(),
                'duration_minutes': active_snooze.snooze_duration_minutes,
                'original_time': active_snooze.original_medication_time.isoformat(),
                'medication_name': active_snooze.medication.name if active_snooze.medication else None
            })
        else:
            return jsonify({'success': False, 'message': 'No active snooze found'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting snooze: {str(e)}'}), 500

@snooze.route('/cancel-snooze/<int:snooze_id>', methods=['POST'])
@login_required
def cancel_snooze(snooze_id):
    """Cancel an active snooze"""
    try:
        snooze_log = SnoozeLog.query.filter_by(
            id=snooze_id,
            user_id=current_user.id
        ).first()
        
        if not snooze_log:
            return jsonify({'success': False, 'message': 'Snooze not found'}), 404
        
        # Only allow canceling snoozes that haven't expired yet
        if snooze_log.snooze_until <= datetime.now():  # Use local time consistently
            return jsonify({'success': False, 'message': 'Snooze has already expired'}), 400
        
        db.session.delete(snooze_log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Snooze canceled successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error canceling snooze: {str(e)}'}), 500

@snooze.route('/clear-expired-snoozes', methods=['POST'])
@login_required
def clear_expired_snoozes():
    """Clear expired snooze records (housekeeping)"""
    try:
        now = datetime.now()  # Use local time consistently
        expired_snoozes = SnoozeLog.query.filter(
            SnoozeLog.user_id == current_user.id,
            SnoozeLog.snooze_until <= now
        ).all()
        
        for snooze in expired_snoozes:
            db.session.delete(snooze)
        
        deleted_count = len(expired_snoozes)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Cleared {deleted_count} expired snooze records'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error clearing expired snoozes: {str(e)}'}), 500
