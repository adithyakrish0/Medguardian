from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from app.extensions import socketio

test_bp = Blueprint('test', __name__)

@test_bp.route('/test-camera')
@login_required
def test_camera():
    """Test page for camera integration"""
    return render_template('test_camera.html')

@test_bp.route('/quick-test')
@login_required
def quick_test():
    """Quick test medication creation page"""
    return render_template('quick_test.html')

@test_bp.route('/simple-test')
@login_required
def simple_test():
    """Super simple test page - no caching"""
    return render_template('test_simple.html')

@test_bp.route('/test-reminder-emit')
@login_required
def test_reminder_emit():
    """TEST ENDPOINT: Directly emit a medication_reminder event to verify SocketIO works"""
    from datetime import datetime
    
    user_id = current_user.id
    room = f'user_{user_id}'
    
    test_data = {
        'medication_id': 999,
        'medication_name': 'TEST DIRECT EMIT',
        'dosage': 'Test dosage',
        'scheduled_time': datetime.now().isoformat(),
        'scheduled_time_display': datetime.now().strftime('%I:%M %p'),
        'instructions': 'This is a direct test of SocketIO emit',
        'priority': 'critical'
    }
    
    # Emit directly - this is from a Flask route (not background thread)
    socketio.emit(
        'medication_reminder',
        test_data,
        room=room,
        namespace='/'
    )
    
    return jsonify({
        'success': True,
        'message': f'Emitted medication_reminder to room {room}',
        'data': test_data
    })

