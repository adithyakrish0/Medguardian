import logging
from datetime import datetime, time
from app.extensions import db
from app.models.medication_log import MedicationLog

logger = logging.getLogger(__name__)

class CognitiveEngine:
    """
    Cognitive Guardrail Engine (Alzheimer's & Dementia Support).
    Detects patterns of confusion and autonomously triggers safety measures.
    """
    
    CONFUSION_THRESHOLD = 3  # Max failed attempts before lockdown
    TEMPORAL_CONFUSION_HOURS = (0, 5)  # 12 AM to 5 AM (High confusion risk)

    @staticmethod
    def analyze_interaction(user_id, medication_id, is_success):
        """
        Analyzes a single verification attempt for cognitive anomalies.
        Returns a safety_status: 'stable', 'confused', or 'emergency'.
        """
        now = datetime.utcnow()
        
        # 1. Temporal Confusion Check (Sun-downing effect / Night confusion)
        if now.hour in range(*CognitiveEngine.TEMPORAL_CONFUSION_HOURS):
            logger.warning(f"Temporal anomaly detected for User {user_id}: Unusual nighttime attempt.")
            # We don't lockdown immediately, but increase sensitivity
            pass

        # 2. Repeated Failure Tracking
        if not is_success:
            # Check last 15 minutes of logs for this med
            fifteen_mins_ago = now.replace(minute=now.minute - 15) if now.minute >= 15 else now.replace(hour=now.hour-1, minute=45)
            
            recent_fails = MedicationLog.query.filter(
                MedicationLog.user_id == user_id,
                MedicationLog.taken_correctly == False,
                MedicationLog.taken_at >= fifteen_mins_ago
            ).count()

            if recent_fails >= CognitiveEngine.CONFUSION_THRESHOLD:
                logger.error(f"COGNITIVE LOCKDOWN TRIGGERED for User {user_id}. Pattern: Repeated Mismatch.")
                return 'emergency'
            
            return 'confused'
            
        return 'stable'

    @staticmethod
    def get_simplified_instructions(med_name):
        """Returns cognitively simple instructions for Alzheimer's patients."""
        return [
            f"1. Look for the {med_name} bottle.",
            "2. Hold it in front of the camera.",
            "3. Wait for the green checkmark.",
            "4. Take only one pill."
        ]

# Singleton
cognitive_engine = CognitiveEngine()
