import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from app.models.medication_log import MedicationLog
from app.models.medication import Medication
from app.extensions import db
import logging
import pickle
import os

logger = logging.getLogger(__name__)

class PredictionService:
    """
    ML Service for predicting medication non-adherence.
    Uses historical log data to train a model that forecasts the likelihood of future misses.
    """
    
    def __init__(self, model_path='app/services/models/adherence_model.pkl'):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("ML Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load ML model: {e}")

    def _extract_features(self, logs):
        """
        Converts MedicationLog objects into a feature DataFrame for ML.
        Features:
        - hour_of_day
        - day_of_week
        - is_weekend
        - medication_priority (encoded)
        - historical_latency_mean
        """
        data = []
        for log in logs:
            if not log.scheduled_time: continue
            
            # Target: 1 if taken correctly/verified, 0 if missed/skipped
            target = 1 if log.status == 'verified' else 0
            
            # Features
            sched = log.scheduled_time
            features = {
                'hour': sched.hour,
                'day_of_week': sched.weekday(),
                'is_weekend': 1 if sched.weekday() >= 5 else 0,
                'priority': 1 if (log.medication and log.medication.priority == 'high') else 0,
                'target': target
            }
            data.append(features)
        
        return pd.DataFrame(data)

    def train_model(self, user_id):
        """Train a personalize model for a user based on their history"""
        logs = MedicationLog.query.filter_by(user_id=user_id).all()
        if len(logs) < 50:
            return {'success': False, 'error': 'Insufficient data (need ~50 logs)'}
        
        df = self._extract_features(logs)
        X = df.drop('target', axis=1)
        y = df['target']
        
        # Train Random Forest
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(model, f)
        
        self.model = model
        return {'success': True, 'score': model.score(X, y)}

    def predict_next_dose(self, medication_id, scheduled_time):
        """
        Predict the probability of taking the next dose.
        """
        if not self.model:
            return {'probability': 0.85, 'note': 'Using heuristic (model not trained)'}
        
        med = Medication.query.get(medication_id)
        features = pd.DataFrame([{
            'hour': scheduled_time.hour,
            'day_of_week': scheduled_time.weekday(),
            'is_weekend': 1 if scheduled_time.weekday() >= 5 else 0,
            'priority': 1 if (med and med.priority == 'high') else 0
        }])
        
        prob = self.model.predict_proba(features)[0][1] # Probability of class 1 (taken)
        return {
            'probability': float(prob),
            'risk_level': 'High' if prob < 0.6 else 'Medium' if prob < 0.8 else 'Low'
        }

prediction_service = PredictionService()
