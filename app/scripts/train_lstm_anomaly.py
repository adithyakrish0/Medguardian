import sys
import os
from datetime import datetime, timedelta
import logging

# Add app to path
sys.path.append(os.getcwd())
from app import create_app, db
from app.models.medication_log import MedicationLog
from app.ml.lstm_anomaly_detector import lstm_detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_batch(patient_id=None, days=180):
    app = create_app()
    with app.app_context():
        # Get patient IDs
        if patient_id:
            patient_ids = [patient_id]
        else:
            # Get all patients with enough data
            patient_ids = [u.id for u in MedicationLog.query.with_entities(MedicationLog.user_id).distinct().all()]
            
        logger.info(f"Targeting {len(patient_ids)} patients for LSTM training...")
        
        for pid in patient_ids:
            try:
                # Fetch logs
                cutoff = datetime.utcnow() - timedelta(days=days)
                logs = MedicationLog.query.filter(
                    MedicationLog.user_id == pid,
                    MedicationLog.scheduled_time >= cutoff
                ).all()
                
                log_dicts = [log.to_dict() for log in logs]
                
                if len(log_dicts) < 7:
                    logger.warning(f"Patient {pid}: Insufficient data ({len(log_dicts)} logs). Skipping.")
                    continue
                
                logger.info(f"Training LSTM for Patient {pid} with {len(log_dicts)} logs...")
                success = lstm_detector.train_for_patient(pid, log_dicts, epochs=100)
                
                if success:
                    logger.info(f"✅ Patient {pid}: Training complete.")
                else:
                    logger.error(f"❌ Patient {pid}: Training failed.")
                    
            except Exception as e:
                logger.error(f"Error processing Patient {pid}: {e}")

if __name__ == "__main__":
    pid_arg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    train_batch(pid_arg)
