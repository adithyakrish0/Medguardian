# app/routes/debug.py
"""
FORENSIC DEBUG MODULE
All logs printed to run.py terminal in real-time
"""
import sys
from flask import Blueprint, request, jsonify
from flask_login import current_user
from datetime import datetime

debug_bp = Blueprint('debug', __name__)

def debug_log(layer, module, function, status, data=""):
    """Print formatted debug log to terminal immediately"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    msg = f"[{layer} | {module} | {function} | {timestamp} | {status} | {data}]"
    print(msg, flush=True)
    sys.stdout.flush()
    return msg

@debug_bp.route('/debug-log', methods=['POST'])
def receive_frontend_log():
    """Receive and print frontend logs to terminal"""
    try:
        data = request.get_json() or {}
        layer = data.get('layer', 'FRONTEND')
        component = data.get('component', 'Unknown')
        event = data.get('event', 'Unknown')
        time_str = data.get('time', datetime.now().strftime("%H:%M:%S.%f")[:-3])
        payload = data.get('data', '')
        status = data.get('status', 'INFO')
        
        msg = f"[{layer} | {component} | {event} | {time_str} | {status} | {payload}]"
        print(msg, flush=True)
        sys.stdout.flush()
        
        return jsonify({'received': True, 'logged': msg})
    except Exception as e:
        err_msg = f"[FRONTEND | DebugEndpoint | receive_log | {datetime.now().strftime('%H:%M:%S')} | ERROR | {str(e)}]"
        print(err_msg, flush=True)
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/debug-state')
def get_debug_state():
    """Get current system state for debugging"""
    from app.models.medication import Medication
    from app.models.medication_log import MedicationLog
    
    now = datetime.now()
    user_id = current_user.id if current_user.is_authenticated else None
    
    state = {
        'server_time': now.isoformat(),
        'server_time_display': now.strftime('%H:%M:%S'),
        'user_id': user_id,
        'authenticated': current_user.is_authenticated
    }
    
    if user_id:
        meds = Medication.query.filter_by(user_id=user_id).all()
        state['medications'] = [{
            'id': m.id,
            'name': m.name,
            'custom_times': m.custom_reminder_times
        } for m in meds]
    
    debug_log('BACKEND', 'DebugState', 'get_debug_state', 'DUMPED', str(state))
    return jsonify(state)
