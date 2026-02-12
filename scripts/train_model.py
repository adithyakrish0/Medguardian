import os
import sys
# Add the project root to sys.path
sys.path.append(os.getcwd())

from app import create_app
from app.services.prediction_service import prediction_service

def train_initial_model():
    app = create_app()
    with app.app_context():
        # User 1 is our main demo user populated by generate_ds_telemetry.py
        print("Training model for User 1...")
        result = prediction_service.train_model(user_id=1)
        if result.get('success'):
            print(f"✅ Model trained successfully! Score: {result['score']:.2%}")
        else:
            print(f"❌ Training failed: {result.get('error')}")

if __name__ == "__main__":
    train_initial_model()
