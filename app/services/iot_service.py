import logging
from flask_socketio import emit
from app.extensions import socketio

logger = logging.getLogger(__name__)

class VirtualIoTService:
    """
    Simulates a hardware pill box (e.g., ESP32 based)
    Provides mock signals for 'Lid Opened' and 'Battery Status'
    """
    
    @staticmethod
    def trigger_lid_open(user_id, med_name="Metformin"):
        """Simulates the hardware sensor detecting a lid opening"""
        logger.info(f"📡 IoT SENSOR: Lid opened for user {user_id}")
        
        # Broadcast to frontend
        socketio.emit('iot_event', {
            'device_id': 'GUARDIAN-VBOX-001',
            'event': 'LID_OPENED',
            'medication': med_name,
            'timestamp': 'Just now'
        }, room=f"user_{user_id}")
        
    @staticmethod
    def get_device_status(user_id):
        """Mocks a health heartbeat from a hardware device"""
        return {
            'device_id': 'GUARDIAN-VBOX-001',
            'status': 'Online',
            'battery': '88%',
            'signal_strength': 'Excellent',
            'last_sync': 'Less than 1 min ago'
        }

virtual_iot_service = VirtualIoTService()
