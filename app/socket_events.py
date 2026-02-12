"""
SocketIO Event Handlers for Real-Time Medication Verification
Handles browser ↔ backend communication for camera-based detection
"""

from flask import request, current_app
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_login import current_user
import base64
import cv2
import numpy as np
from datetime import datetime
import logging

from app.extensions import socketio
from app.services.auto_verification_service import auto_verification_service

logger = logging.getLogger(__name__)


def register_handlers(socketio_instance):
    """Register all SocketIO event handlers"""
    
    @socketio_instance.on('connect')
    def handle_connect():
        """Handle client connection"""
        if current_user.is_authenticated:
            logger.info(f"✅ SocketIO connected: user_id={current_user.id}, sid={request.sid}")
        else:
            logger.warning(f"⚠️ SocketIO connected: unauthenticated user, sid={request.sid}")
    
    
    @socketio_instance.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection - clean up any active sessions"""
        if current_user.is_authenticated:
            user_id = current_user.id
            logger.info(f"🔌 SocketIO disconnected: user_id={user_id}, sid={request.sid}")
            
            # Clean up any active verification sessions for this user
            sessions_to_cleanup = [
                session_id for session_id, session in auto_verification_service.active_sessions.items()
                if session.get('user_id') == user_id
            ]
            
            for session_id in sessions_to_cleanup:
                session = auto_verification_service.active_sessions.get(session_id)
                if session:
                    session['status'] = 'disconnected'
                    logger.info(f"🧹 Cleaned up session {session_id} due to disconnect")
        else:
            logger.info(f"🔌 SocketIO disconnected: unauthenticated user, sid={request.sid}")
    
    
    @socketio_instance.on('join')
    def handle_join(data):
        """
        Join user-specific room for targeted notifications
        
        Args:
            data: {'room': 'user_{user_id}'}
        """
        room = data.get('room')
        if not room:
            logger.error("❌ Join event missing 'room' parameter")
            emit('error', {'message': 'Missing room parameter'})
            return
        
        join_room(room)
        logger.info(f"✅ User joined room: {room}, sid={request.sid}, user_id={current_user.id if current_user.is_authenticated else 'ANON'}")
        emit('joined', {'room': room, 'message': f'Joined room {room}'})
    
    
    @socketio_instance.on('leave')
    def handle_leave(data):
        """Leave a room"""
        room = data.get('room')
        if room:
            leave_room(room)
            logger.info(f"👋 User left room: {room}, sid={request.sid}")
            emit('left', {'room': room})
    
    
    @socketio_instance.on('start_auto_verification')
    def handle_start_auto_verification(data):
        """
        Start automatic verification session (initiated by frontend)
        
        Args:
            data: {
                'medication_id': int,
                'scheduled_time': ISO datetime string (optional)
            }
        
        Returns:
            Emits 'auto_verification_started' with session_id
        """
        if not current_user.is_authenticated:
            emit('error', {'message': 'Authentication required'})
            return
        
        medication_id = data.get('medication_id')
        scheduled_time_str = data.get('scheduled_time')
        
        if not medication_id:
            logger.error("❌ Missing medication_id in start_auto_verification")
            emit('error', {'message': 'Missing medication_id'})
            return
        
        # Parse scheduled time or use current time
        if scheduled_time_str:
            try:
                scheduled_time = datetime.fromisoformat(scheduled_time_str.replace('Z', '+00:00'))
            except ValueError:
                scheduled_time = datetime.now()
        else:
            scheduled_time = datetime.now()
        
        logger.info(f"🎥 Starting auto-verification: user={current_user.id}, med={medication_id}")
        
        # Start verification session
        session = auto_verification_service.start_auto_verification(
            medication_id=medication_id,
            user_id=current_user.id,
            scheduled_time=scheduled_time
        )
        
        # Notify frontend that session is active
        emit('auto_verification_started', {
            'session_id': session['session_id'],
            'medication_id': medication_id,
            'message': 'Auto-verification session started',
            'timeout_seconds': auto_verification_service.detection_window
        }, room=f'user_{current_user.id}')
        
        logger.info(f"✅ Auto-verification session started: {session['session_id']}")
    
    
    @socketio_instance.on('process_detection_frame')
    def handle_process_detection_frame(data):
        """
        Process incoming detection frame from browser camera
        
        Args:
            data: {
                'session_id': str,
                'frame': base64-encoded JPEG string,
                'timestamp': int (milliseconds)
            }
        
        Returns:
            Emits 'detection_result' with bounding boxes and confidence
        """
        if not current_user.is_authenticated:
            emit('error', {'message': 'Authentication required'})
            return
        
        session_id = data.get('session_id')
        frame_data = data.get('frame')
        
        if not session_id or not frame_data:
            logger.error("❌ Missing session_id or frame in process_detection_frame")
            emit('error', {'message': 'Missing required parameters'})
            return
        
        # Get session
        session = auto_verification_service.active_sessions.get(session_id)
        if not session:
            logger.warning(f"⚠️ Session not found: {session_id}")
            emit('error', {'message': 'Invalid or expired session'})
            return
        
        # Verify user owns this session
        if session['user_id'] != current_user.id:
            logger.error(f"❌ User {current_user.id} tried to access session {session_id} owned by {session['user_id']}")
            emit('error', {'message': 'Unauthorized'})
            return
        
        try:
            # Decode base64 frame to numpy array
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]  # Remove "data:image/jpeg;base64," prefix
            
            frame_bytes = base64.b64decode(frame_data)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.error("❌ Failed to decode frame")
                emit('error', {'message': 'Invalid frame data'})
                return
            
            # Run detection
            bottles_detected, detections, annotated_frame = auto_verification_service.detector.detect_bottles(
                frame, return_image=True
            )
            
            # Calculate confidence
            max_confidence = max((d[4] for d in detections), default=0.0)
            
            # Update session state
            if bottles_detected and detections:
                session['detections'].append({
                    'timestamp': datetime.now().isoformat(),
                    'confidence': float(max_confidence),
                    'count': len(detections)
                })
            
            # Encode annotated frame back to base64
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send detection results back to frontend
            result_data = {
                'session_id': session_id,
                'detected': bottles_detected,
                'confidence': float(max_confidence),
                'count': len(detections) if detections else 0,
                'detections': [
                    {
                        'bbox': [float(d[0]), float(d[1]), float(d[2]), float(d[3])],
                        'confidence': float(d[4]),
                        'class': int(d[5]) if len(d) > 5 else 0
                    }
                    for d in detections
                ] if detections else [],
                'annotated_frame': f'data:image/jpeg;base64,{annotated_base64}',
                'timestamp': datetime.now().isoformat()
            }
            
            emit('detection_result', result_data, room=f'user_{current_user.id}')
            
            # Check if we should auto-log (high confidence + multiple detections)
            if max_confidence >= auto_verification_service.confidence_threshold:
                high_conf_count = session.get('high_confidence_count', 0) + 1
                session['high_confidence_count'] = high_conf_count
                
                # Require 3 consecutive high-confidence detections for safety
                if high_conf_count >= 3 and not session.get('auto_logged'):
                    logger.info(f"🎯 AUTO-LOGGING triggered: session={session_id}, confidence={max_confidence:.2%}")
                    auto_verification_service._auto_log_medication(session, max_confidence)
                    
                    # Notify frontend of success
                    emit('detection_success', {
                        'session_id': session_id,
                        'confidence': float(max_confidence),
                        'message': 'Medication verified and logged automatically!'
                    }, room=f'user_{current_user.id}')
            else:
                # Reset high confidence counter if confidence drops
                session['high_confidence_count'] = 0
            
        except Exception as e:
            logger.error(f"❌ Error processing detection frame: {e}", exc_info=True)
            emit('error', {'message': f'Frame processing error: {str(e)}'})
    
    
    @socketio_instance.on('stop_detection_session')
    def handle_stop_detection_session(data):
        """
        Stop active detection session and clean up resources
        
        Args:
            data: {'session_id': str}
        """
        if not current_user.is_authenticated:
            emit('error', {'message': 'Authentication required'})
            return
        
        session_id = data.get('session_id')
        if not session_id:
            logger.error("❌ Missing session_id in stop_detection_session")
            emit('error', {'message': 'Missing session_id'})
            return
        
        session = auto_verification_service.active_sessions.get(session_id)
        if not session:
            logger.warning(f"⚠️ Attempted to stop non-existent session: {session_id}")
            emit('error', {'message': 'Session not found'})
            return
        
        # Verify ownership
        if session['user_id'] != current_user.id:
            logger.error(f"❌ Unauthorized stop attempt: user={current_user.id}, session={session_id}")
            emit('error', {'message': 'Unauthorized'})
            return
        
        # Mark session as stopped
        session['status'] = 'stopped'
        logger.info(f"🛑 Detection session stopped: {session_id}")
        
        emit('detection_session_stopped', {
            'session_id': session_id,
            'message': 'Detection session stopped successfully'
        }, room=f'user_{current_user.id}')
    
    
    @socketio_instance.on('manual_confirm_medication')
    def handle_manual_confirm(data):
        """
        Handle manual confirmation when auto-detection fails
        
        Args:
            data: {
                'session_id': str,
                'taken': bool
            }
        """
        if not current_user.is_authenticated:
            emit('error', {'message': 'Authentication required'})
            return
        
        session_id = data.get('session_id')
        taken = data.get('taken', False)
        
        if not session_id:
            logger.error("❌ Missing session_id in manual_confirm_medication")
            emit('error', {'message': 'Missing session_id'})
            return
        
        logger.info(f"👤 Manual confirmation: session={session_id}, taken={taken}, user={current_user.id}")
        
        success = auto_verification_service.manual_confirm(
            session_id=session_id,
            taken=taken,
            user_id=current_user.id
        )
        
        if success:
            emit('manual_confirm_success', {
                'session_id': session_id,
                'taken': taken,
                'message': f'Medication marked as {"taken" if taken else "not taken"}'
            }, room=f'user_{current_user.id}')
        else:
            emit('error', {'message': 'Failed to record manual confirmation'})
    
    
    logger.info("✅ SocketIO event handlers registered successfully")
