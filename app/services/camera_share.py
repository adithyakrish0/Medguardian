"""
Remote Camera Sharing Service
Allows caregivers to request and view senior's camera feed via Socket.IO
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import current_user
import logging

logger = logging.getLogger(__name__)

# Store active camera sessions: {senior_id: caregiver_id}
active_camera_sessions = {}

# Store pending requests: {senior_id: caregiver_id}
pending_camera_requests = {}


def register_camera_events(socketio: SocketIO):
    """Register Socket.IO event handlers for camera sharing"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection - join user's room"""
        if current_user.is_authenticated:
            # Join room based on user ID for targeted emits
            join_room(f'user_{current_user.id}')
            logger.info(f"User {current_user.id} connected to camera service")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnect - cleanup any active sessions"""
        if current_user.is_authenticated:
            user_id = current_user.id
            
            # Stop any active camera sharing
            if user_id in active_camera_sessions:
                caregiver_id = active_camera_sessions[user_id]
                del active_camera_sessions[user_id]
                emit('camera_stopped', {'senior_id': user_id}, room=f'user_{caregiver_id}')
            
            # Cancel pending requests
            if user_id in pending_camera_requests:
                del pending_camera_requests[user_id]
    
    @socketio.on('request_camera')
    def handle_camera_request(data):
        """Caregiver requests to view senior's camera"""
        if not current_user.is_authenticated or current_user.role != 'caregiver':
            emit('camera_error', {'error': 'Unauthorized'})
            return
        
        senior_id = data.get('senior_id')
        if not senior_id:
            emit('camera_error', {'error': 'No senior ID provided'})
            return
        
        # Verify caregiver has permission
        from app.models.relationship import CaregiverSenior
        from app.models.auth import User
        
        relationship = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=senior_id
        ).first()
        
        if not relationship:
            emit('camera_error', {'error': 'No permission to view this senior'})
            return
        
        # Get senior user to check auto-accept preference
        senior = User.query.get(senior_id)
        if not senior:
            emit('camera_error', {'error': 'Senior not found'})
            return
        
        # Check if senior has auto-accept enabled
        if getattr(senior, 'camera_auto_accept', False):
            # Auto-accept: immediately start session
            active_camera_sessions[senior_id] = current_user.id
            
            # Notify caregiver that it's accepted
            emit('camera_accepted', {
                'senior_id': senior_id,
                'message': 'Camera access granted (auto-accepted)'
            })
            
            # Tell senior to start streaming
            emit('start_streaming', {'auto_accepted': True}, room=f'user_{senior_id}')
            
            logger.info(f"Auto-accepted camera request from {current_user.id} for senior {senior_id}")
        else:
            # Normal flow: store pending request and ask senior
            pending_camera_requests[senior_id] = current_user.id
            
            # Send request to senior
            emit('camera_request', {
                'caregiver_id': current_user.id,
                'caregiver_name': current_user.username
            }, room=f'user_{senior_id}')
            
            emit('request_sent', {'message': 'Camera access request sent'})
            logger.info(f"Caregiver {current_user.id} requested camera from senior {senior_id}")
    
    @socketio.on('camera_response')
    def handle_camera_response(data):
        """Senior accepts or denies camera request"""
        if not current_user.is_authenticated:
            return
        
        senior_id = current_user.id
        accepted = data.get('accepted', False)
        
        if senior_id not in pending_camera_requests:
            emit('camera_error', {'error': 'No pending request'})
            return
        
        caregiver_id = pending_camera_requests[senior_id]
        del pending_camera_requests[senior_id]
        
        if accepted:
            # Start camera session
            active_camera_sessions[senior_id] = caregiver_id
            
            # Notify caregiver
            emit('camera_accepted', {
                'senior_id': senior_id,
                'message': 'Camera access granted'
            }, room=f'user_{caregiver_id}')
            
            # Tell senior to start streaming
            emit('start_streaming', {})
            
            logger.info(f"Senior {senior_id} accepted camera request from {caregiver_id}")
        else:
            # Notify caregiver of denial
            emit('camera_denied', {
                'senior_id': senior_id,
                'message': 'Camera access denied'
            }, room=f'user_{caregiver_id}')
            
            logger.info(f"Senior {senior_id} denied camera request from {caregiver_id}")
    
    @socketio.on('camera_frame')
    def handle_camera_frame(data):
        """Receive camera frame from senior and forward to caregiver"""
        if not current_user.is_authenticated:
            return
        
        senior_id = current_user.id
        
        if senior_id not in active_camera_sessions:
            emit('stop_streaming', {})
            return
        
        caregiver_id = active_camera_sessions[senior_id]
        frame_data = data.get('frame')  # Base64 encoded image
        
        if frame_data:
            # Forward frame to caregiver
            emit('camera_frame', {
                'senior_id': senior_id,
                'frame': frame_data,
                'timestamp': data.get('timestamp')
            }, room=f'user_{caregiver_id}')
    
    @socketio.on('stop_camera')
    def handle_stop_camera(data):
        """Stop camera sharing (called by either party)"""
        if not current_user.is_authenticated:
            return
        
        user_id = current_user.id
        senior_id = data.get('senior_id', user_id)
        
        if senior_id in active_camera_sessions:
            caregiver_id = active_camera_sessions[senior_id]
            del active_camera_sessions[senior_id]
            
            # Notify both parties
            emit('camera_stopped', {'message': 'Camera sharing stopped'}, room=f'user_{senior_id}')
            emit('camera_stopped', {'message': 'Camera sharing stopped'}, room=f'user_{caregiver_id}')
            
            logger.info(f"Camera session stopped for senior {senior_id}")


def is_camera_active(senior_id: int) -> bool:
    """Check if senior's camera is currently being shared"""
    return senior_id in active_camera_sessions
