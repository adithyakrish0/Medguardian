"""
AUTO-VERIFICATION SERVICE
Elderly-First Zero-Touch Medication Verification

This service automatically:
1. Turns camera ON when medication reminder triggers
2. Runs real-time bottle detection for 60 seconds
3. Auto-logs if bottle detected with high confidence
4. Escalates to caregiver if not detected
5. Provides voice feedback throughout

NO MANUAL INTERACTION REQUIRED FROM ELDERLY USER
"""

import cv2
import numpy as np
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from flask import current_app
from app.extensions import db, socketio
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.vision.bottle_detector import MedicineBottleDetector
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


class AutoVerificationService:
    """
    Handles fully automated medication verification with zero user interaction
    """
    
    def __init__(self):
        self.detector = MedicineBottleDetector()
        self.notification_service = NotificationService()
        self.active_sessions = {}  # Track active verification sessions
        
        # Configuration
        self.detection_window = 60  # seconds to try detection
        self.confidence_threshold = 0.75  # 75% confidence for auto-log
        self.detection_interval = 2  # check every 2 seconds
        self.max_retries = 3
        
    def start_auto_verification(self, medication_id: int, user_id: int, 
                               scheduled_time: datetime) -> Dict:
        """
        Start automatic verification session for a medication reminder
        
        Args:
            medication_id: ID of medication to verify
            user_id: ID of user/senior
            scheduled_time: When medication was due
            
        Returns:
            Session info dict
        """
        session_id = f"{user_id}_{medication_id}_{int(time.time())}"
        
        # Create session
        session = {
            'session_id': session_id,
            'medication_id': medication_id,
            'user_id': user_id,
            'scheduled_time': scheduled_time,
            'start_time': datetime.now(),
            'status': 'active',
            'detections': [],
            'auto_logged': False
        }
        
        self.active_sessions[session_id] = session
        
        # Notify user: Camera turning on automatically
        socketio.emit('auto_verification_start', {
            'message': 'Camera starting automatically to verify medication...',
            'medication_id': medication_id,
            'session_id': session_id,
            'voice_text': 'Please hold your medication near the camera'
        }, room=f'user_{user_id}')
        
        # Start detection in background thread
        detection_thread = threading.Thread(
            target=self._run_detection_loop,
            args=(session_id,),
            daemon=True
        )
        detection_thread.start()
        
        logger.info(f"Auto-verification session started: {session_id}")
        return session
    
    def _run_detection_loop(self, session_id: str):
        """
        Main detection monitoring loop - runs in background thread
        Monitors detection results from SocketIO frame processing
        
        NOTE: Actual frame processing happens in socket_events.py
        This loop monitors session state and handles timeouts/escalation
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return
        
        user_id = session['user_id']
        medication_id = session['medication_id']
        end_time = datetime.now() + timedelta(seconds=self.detection_window)
        
        # Initialize session detection tracking
        session['high_confidence_count'] = 0
        session['last_feedback_time'] = datetime.now()
        
        logger.info(f"🔍 Detection monitoring started for session {session_id}")
        logger.info(f"⏰ Detection window: {self.detection_window} seconds (until {end_time.strftime('%H:%M:%S')})")
        
        try:
            # Monitor session until timeout or completion
            while datetime.now() < end_time and session['status'] == 'active':
                # Check if already auto-logged by SocketIO handler
                if session.get('auto_logged'):
                    logger.info(f"✅ Session {session_id} auto-logged successfully")
                    break
                
                # Periodic voice feedback (every 15 seconds)
                elapsed = (datetime.now() - session['start_time']).total_seconds()
                time_since_last_feedback = (datetime.now() - session['last_feedback_time']).total_seconds()
                
                if time_since_last_feedback >= 15:
                    remaining = int((end_time - datetime.now()).total_seconds())
                    if remaining > 0:
                        socketio.emit('voice_prompt', {
                            'text': f'Please show your medication bottle. {remaining} seconds remaining.',
                            'type': 'reminder',
                            'remaining_seconds': remaining
                        }, room=f'user_{user_id}')
                        
                        session['last_feedback_time'] = datetime.now()
                        logger.info(f"🔊 Voice prompt sent: {remaining}s remaining")
                
                # Sleep briefly to avoid tight loop
                time.sleep(1.0)
            
            # Session ended - check final status
            if session.get('auto_logged'):
                logger.info(f"✅ Detection monitoring complete: AUTO-LOGGED for session {session_id}")
            elif session['status'] == 'stopped':
                logger.info(f"🛑 Detection monitoring stopped manually: {session_id}")
            else:
                # Timeout without detection
                logger.warning(f"⏰ Detection timeout for session {session_id} - no medication detected")
                self._handle_no_detection(session)
            
        except Exception as e:
            logger.error(f"❌ Detection monitoring error for {session_id}: {e}", exc_info=True)
            self._handle_detection_error(session, str(e))
        
        finally:
            session['status'] = 'completed'
            logger.info(f"🏁 Detection monitoring ended for {session_id}")

    
    def _auto_log_medication(self, session: Dict, confidence: float):
        """
        Automatically log medication as taken when detected
        """
        from app import create_app
        app = create_app()
        
        with app.app_context():
            try:
                medication = Medication.query.get(session['medication_id'])
                if not medication:
                    logger.error(f"Medication {session['medication_id']} not found")
                    return
                
                # Create log entry
                log = MedicationLog(
                    user_id=session['user_id'],
                    medication_id=session['medication_id'],
                    taken_at=datetime.now(),
                    scheduled_time=session['scheduled_time'],
                    taken_correctly=True,
                    verified_by_camera=True,
                    verification_confidence=confidence,
                    verification_method='auto',
                    notes=f'Automatically verified with {confidence:.0%} confidence'
                )
                
                db.session.add(log)
                db.session.commit()
                
                session['auto_logged'] = True
                session['log_id'] = log.id
                
                # Notify user
                socketio.emit('medication_auto_logged', {
                    'success': True,
                    'medication_name': medication.name,
                    'confidence': float(confidence),
                    'message': f'✓ {medication.name} verified and logged automatically!',
                    'voice_text': f'Medication verified. Thank you!'
                }, room=f'user_{session["user_id"]}')
                
                # Notify caregiver
                self._notify_caregiver_success(session, medication, confidence)
                
                logger.info(f"AUTO-LOGGED: {medication.name} for user {session['user_id']}")
                
            except Exception as e:
                logger.error(f"Auto-log error: {e}")
                db.session.rollback()
    
    def _handle_no_detection(self, session: Dict):
        """
        Handle case where no medication was detected during window
        Escalate to caregiver and prompt user
        """
        user_id = session['user_id']
        medication_id = session['medication_id']
        
        # Get medication for context
        from app import create_app
        app = create_app()
        with app.app_context():
            medication = Medication.query.get(medication_id)
            med_name = medication.name if medication else 'medication'
        
        # Alert user with voice + visual
        socketio.emit('verification_failed', {
            'type': 'no_detection',
            'medication_id': medication_id,
            'message': 'Could not automatically verify medication. Please confirm manually.',
            'voice_text': f'I could not see your {med_name}. Did you take it?',
            'show_manual_confirm': True  # Show big YES/NO buttons
        }, room=f'user_{user_id}')
        
        # ESCALATE to caregiver
        self._escalate_to_caregiver(session, 'no_detection', 
                                    f'Could not verify {med_name} automatically')
        
        logger.warning(f"No detection for session {session['session_id']}")
    
    def _handle_camera_failure(self, session: Dict):
        """
        Handle camera failure - immediate escalation
        """
        user_id = session['user_id']
        
        # Alert user
        socketio.emit('camera_failure', {
            'message': 'Camera unavailable. Please confirm manually.',
            'voice_text': 'Camera is not working. Did you take your medication?',
            'show_manual_confirm': True
        }, room=f'user_{user_id}')
        
        # CRITICAL: Escalate to caregiver immediately
        self._escalate_to_caregiver(session, 'camera_failure', 
                                    'Camera failed to start for medication verification')
        
        session['status'] = 'failed'
    
    def _handle_detection_error(self, session: Dict, error: str):
        """
        Handle detection errors gracefully
        """
        logger.error(f"Detection error in session {session['session_id']}: {error}")
        self._escalate_to_caregiver(session, 'detection_error', 
                                    f'Error during automatic verification: {error}')
        session['status'] = 'error'
    
    def _escalate_to_caregiver(self, session: Dict, alert_type: str, message: str):
        """
        Send high-priority alert to caregiver
        """
        from app import create_app
        app = create_app()
        
        with app.app_context():
            try:
                medication = Medication.query.get(session['medication_id'])
                
                # Send via notification service
                self.notification_service.notify_caregivers_for_user(
                    user_id=session['user_id'],
                    alert_type=alert_type,
                    medication_name=medication.name if medication else 'Unknown',
                    details=message,
                    priority='high'
                )
                
                # Also send SocketIO to caregiver dashboard
                socketio.emit('caregiver_alert', {
                    'type': alert_type,
                    'user_id': session['user_id'],
                    'medication_id': session['medication_id'],
                    'medication_name': medication.name if medication else 'Unknown',
                    'message': message,
                    'timestamp': datetime.now().isoformat(),
                    'priority': 'high'
                }, room='caregivers')
                
                logger.info(f"Escalated to caregiver: {alert_type}")
                
            except Exception as e:
                logger.error(f"Failed to escalate to caregiver: {e}")
    
    def _notify_caregiver_success(self, session: Dict, medication: Medication, 
                                 confidence: float):
        """
        Notify caregiver of successful auto-verification
        """
        socketio.emit('medication_verified', {
            'type': 'auto_verified',
            'user_id': session['user_id'],
            'medication_id': session['medication_id'],
            'medication_name': medication.name,
            'confidence': float(confidence),
            'timestamp': datetime.now().isoformat(),
            'method': 'automatic'
        }, room='caregivers')
    
    def manual_confirm(self, session_id: str, taken: bool, user_id: int) -> bool:
        """
        Handle manual confirmation from user when auto-detection fails
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return False
        
        from app import create_app
        app = create_app()
        
        with app.app_context():
            try:
                log = MedicationLog(
                    user_id=user_id,
                    medication_id=session['medication_id'],
                    taken_at=datetime.now() if taken else None,
                    scheduled_time=session['scheduled_time'],
                    taken_correctly=taken,
                    verified_by_camera=False,
                    verification_method='manual_fallback',
                    notes='Manual confirmation after auto-verification failed'
                )
                
                db.session.add(log)
                db.session.commit()
                
                # Notify caregiver
                medication = Medication.query.get(session['medication_id'])
                self.notification_service.notify_caregivers_for_user(
                    user_id=user_id,
                    alert_type='manual_confirm',
                    medication_name=medication.name if medication else 'Unknown',
                    details=f'User manually confirmed: {taken}',
                    priority='normal'
                )
                
                session['status'] = 'manual_confirm'
                session['manually_confirmed'] = taken
                
                return True
                
            except Exception as e:
                logger.error(f"Manual confirm error: {e}")
                db.session.rollback()
                return False


# Global instance
auto_verification_service = AutoVerificationService()
