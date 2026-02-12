import os
import sys
sys.path.append(os.getcwd())
from app import create_app
from app.models.medication_log import MedicationLog
from app.services.prediction_service import prediction_service

def verify_ml_status():
    app = create_app()
    with app.app_context():
        count = MedicationLog.query.filter_by(user_id=1).count()
        print(f"Total Logs for User 1: {count}")
        
        model_exists = os.path.exists(prediction_service.model_path)
        print(f"Model exists at {prediction_service.model_path}: {model_exists}")
        
        if model_exists:
             # Try a test prediction
             from datetime import datetime
             test_pred = prediction_service.predict_next_dose(1, datetime.now())
             print(f"Test Prediction: {test_pred}")

if __name__ == "__main__":
    verify_ml_status()
