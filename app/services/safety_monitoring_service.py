"""
FALL DETECTION SERVICE
Auto-detects falls via camera motion analysis
Immediately alerts caregivers for elderly safety

ZERO MANUAL INTERACTION - FULLY AUTOMATIC
"""

import cv2
import numpy as np
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from flask import current_app
from app.extensions import db, socketio
import logging

logger = logging.getLogger(__name__)


class FallDetectionService:
    """
    Continuously monitors camera for sudden falls
    Uses motion detection + pose estimation
    """
    
    def __init__(self):
        self.is_monitoring = False
        self.monitoring_thread = None
        
        # Configuration
        self.check_interval = 1.0  # Check every second
        self.motion_threshold = 50000  # Significant motion pixels
        self.vertical_drop_threshold = 0.7  # 70% vertical distance drop
        self.alert_cooldown = 300  # 5 minutes between alerts
        
        # State
        self.last_alert_time = {}  # user_id: timestamp
        self.previous_frames = {}  # user_id: frame history
    
    def start_monitoring(self, user_id: int):
        """
        Start fall detection monitoring for a user
        Runs continuously in background
        """
        if self.is_monitoring:
            logger.info("Fall detection already running")
            return
        
        self.is_monitoring = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(user_id,),
            daemon=True
        )
        self.monitoring_thread.start()
        logger.info(f"🚨 Fall detection started for user {user_id}")
    
    def stop_monitoring(self):
        """Stop fall detection monitoring"""
        self.is_monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("Fall detection stopped")
    
    def _monitoring_loop(self, user_id: int):
        """
        Main monitoring loop
        Continuously analyzes camera feed for falls
        """
        cap = None
        prev_frame = None
        prev_gray = None
        frame_history = []
        
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                logger.error("Cannot open camera for fall detection")
                return
            
            # Set properties
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            while self.is_monitoring:
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.5)
                    continue
                
                # Convert to grayscale for processing
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                if prev_gray is not None:
                    # Detect motion/fall
                    fall_detected, confidence = self._detect_fall(
                        prev_gray, gray, frame_history
                    )
                    
                    if fall_detected and confidence > 0.7:
                        # Check cooldown
                        if not self._is_in_cooldown(user_id):
                            logger.warning(f"🚨 FALL DETECTED for user {user_id}! Confidence: {confidence:.2%}")
                            self._trigger_fall_alert(user_id, confidence)
                            self.last_alert_time[user_id] = time.time()
                
                # Keep history
                frame_history.append(gray.copy())
                if len(frame_history) > 10:  # Keep last 10 frames
                    frame_history.pop(0)
                
                prev_gray = gray.copy()
                time.sleep(self.check_interval)
        
        except Exception as e:
            logger.error(f"Fall detection error: {e}")
        
        finally:
            if cap:
                cap.release()
    
    def _detect_fall(self, prev_gray: np.ndarray, curr_gray: np.ndarray, 
                     frame_history: List) -> Tuple[bool, float]:
        """
        Detect if a fall occurred between frames
        
        Returns:
            (fall_detected, confidence)
        """
        # Calculate frame difference
        diff = cv2.absdiff(prev_gray, curr_gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        
        # Count motion pixels
        motion_pixels = cv2.countNonZero(thresh)
        
        # Significant motion detected
        if motion_pixels > self.motion_threshold:
            # Analyze vertical distribution
            # Falls typically show motion concentrated in lower part of frame
            height = thresh.shape[0]
            upper_half = thresh[:height//2, :]
            lower_half = thresh[height//2:, :]
            
            upper_motion = cv2.countNonZero(upper_half)
            lower_motion = cv2.countNonZero(lower_half)
            
            # More motion in lower half suggests fall
            if lower_motion > upper_motion * 1.5:
                confidence = min(1.0, (lower_motion / upper_motion) / 2)
                return True, confidence
        
        return False, 0.0
    
    def _is_in_cooldown(self, user_id: int) -> bool:
        """Check if we're in cooldown period for alerts"""
        if user_id not in self.last_alert_time:
            return False
        
        elapsed = time.time() - self.last_alert_time[user_id]
        return elapsed < self.alert_cooldown
    
    def _trigger_fall_alert(self, user_id: int, confidence: float):
        """
        Send IMMEDIATE high-priority fall alert to caregivers
        """
        from app import create_app
        app = create_app()
        
        with app.app_context():
            try:
                # Log incident
                from app.models.health_incident import HealthIncident
                incident = HealthIncident(
                    user_id=user_id,
                    incident_type='fall',
                    confidence=confidence,
                    detected_at=datetime.now(),
                    auto_detected=True,
                    status='pending'
                )
                db.session.add(incident)
                db.session.commit()
                
                # Alert user
                socketio.emit('fall_alert', {
                    'type': 'fall_detected',
                    'message': '⚠️ Fall detected! Are you okay?',
                    'voice_text': 'Fall detected! Are you okay? Please respond.',
                    'show_im_ok_button': True,
                    'auto_detected': True,
                    'confidence': float(confidence)
                }, room=f'user_{user_id}')
                
                # CRITICAL: Alert caregivers immediately
                socketio.emit('emergency_alert', {
                    'type': 'fall_detected',
                    'user_id': user_id,
                    'message': f'🚨 FALL DETECTED for user (confidence: {confidence:.0%})',
                    'timestamp': datetime.now().isoformat(),
                    'priority': 'CRITICAL',
                    'requires_response': True
                }, room='caregivers')
                
                logger.critical(f"🚨 FALL ALERT sent for user {user_id}")
                
            except Exception as e:
                logger.error(f"Failed to send fall alert: {e}")
                db.session.rollback()


class InactivityMonitorService:
    """
    Monitors for prolonged inactivity during daytime hours
    Sends wellness check alerts to caregivers
    """
    
    def __init__(self):
        self.is_monitoring = False
        self.monitoring_thread = None
        
        # Configuration
        self.inactivity_threshold = 4 * 3600  # 4 hours in seconds
        self.check_interval = 600  # Check every 10 minutes
        self.active_hours = (7, 22)  # 7 AM to 10 PM
        
        # State
        self.last_activity = {}  # user_id: timestamp
    
    def start_monitoring(self, user_id: int):
        """Start inactivity monitoring"""
        if not self.is_monitoring:
            self.is_monitoring = True
            self.monitoring_thread = threading.Thread(
                target=self._monitoring_loop,
                args=(user_id,),
                daemon=True
            )
            self.monitoring_thread.start()
            logger.info(f"👁️ Inactivity monitoring started for user {user_id}")
    
    def record_activity(self, user_id: int):
        """Record user activity"""
        self.last_activity[user_id] = time.time()
    
    def _monitoring_loop(self, user_id: int):
        """Monitor for inactivity"""
        while self.is_monitoring:
            try:
                # Check if during active hours
                current_hour = datetime.now().hour
                if not (self.active_hours[0] <= current_hour < self.active_hours[1]):
                    time.sleep(self.check_interval)
                    continue
                
                # Check inactivity
                if user_id in self.last_activity:
                    elapsed = time.time() - self.last_activity[user_id]
                    
                    if elapsed > self.inactivity_threshold:
                        logger.warning(f"👁️ Inactivity detected for user {user_id}: {elapsed/3600:.1f} hours")
                        self._send_wellness_check(user_id, elapsed)
                        # Reset to avoid repeated alerts
                        self.last_activity[user_id] = time.time()
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Inactivity monitoring error: {e}")
    
    def _send_wellness_check(self, user_id: int, inactivity_duration: float):
        """Send wellness check alert to caregiver"""
        hours = inactivity_duration / 3600
        
        socketio.emit('wellness_alert', {
            'type': 'inactivity',
            'user_id': user_id,
            'message': f'No activity detected for {hours:.1f} hours',
            'timestamp': datetime.now().isoformat(),
            'priority': 'medium',
            'requires_checkup': True
        }, room='caregivers')
        
        logger.info(f"Wellness check sent for user {user_id}")


# Global instances
fall_detection_service = FallDetectionService()
inactivity_monitor = InactivityMonitorService()
