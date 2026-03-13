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

from app.ml.ensemble_adherence_predictor import EnsembleAdherencePredictor

import threading

class PredictionService:
    """
    ML Service for predicting medication non-adherence using an Ensemble model.
    """
    
    def __init__(self, model_path='app/services/models/ensemble_adherence_model.pkl'):
        # model_path is relative to project root
        self.model_path = model_path
        self.model = None
        self.loading = True
        
        # Async load
        thread = threading.Thread(target=self._load_model, daemon=True)
        thread.start()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                # Assuming simple pickle load is thread-safe enough for read
                self.model = EnsembleAdherencePredictor.load(self.model_path)
                logger.info("Ensemble Adherence Model loaded successfully (Async).")
            except Exception as e:
                logger.error(f"Failed to load Ensemble model: {e}")
        self.loading = False

    def _extract_features(self, logs):
        data = []
        for log in logs:
            if not log.scheduled_time: continue
            target = 1 if log.status == 'verified' else 0
            sched = log.scheduled_time
            features = {
                'hour': sched.hour,
                'day_of_week': sched.weekday(),
                'is_weekend': 1 if sched.weekday() >= 5 else 0,
                'priority_encoded': 1 if (log.medication and log.medication.priority == 'high') else 0,
                'target': target
            }
            data.append(features)
        return pd.DataFrame(data)

    def train_model(self, user_id):
        """Train a personalized ensemble model for a user"""
        logs = MedicationLog.query.filter_by(user_id=user_id).all()
        if len(logs) < 50:
            return {'success': False, 'error': 'Insufficient data (need ~50 logs)'}
        
        df = self._extract_features(logs)
        X = df.drop('target', axis=1)
        y = df['target']
        
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        
        predictor = EnsembleAdherencePredictor()
        predictor.train(X_train, y_train, X_val, y_val)
        predictor.save(self.model_path)
        
        self.model = predictor
        return {'success': True, 'score': predictor.ensemble.score(X_val, y_val)}

    def predict_next_dose(self, medication_id, scheduled_time):
        """
        Predict the probability of taking the next dose using the ensemble.
        """
        if not self.model:
            return {'probability': 0.85, 'note': 'Using heuristic (model not trained)'}
        
        med = Medication.query.get(medication_id)
        features = pd.DataFrame([{
            'hour': scheduled_time.hour,
            'day_of_week': scheduled_time.weekday(),
            'is_weekend': 1 if scheduled_time.weekday() >= 5 else 0,
            'priority_encoded': 1 if (med and med.priority == 'high') else 0
        }])
        
        prob = self.model.predict_proba(features)[0][1]
        
        # Calculate SHAP values for explainability
        explanation = self.get_explanation(features)
        
        return {
            'probability': float(prob),
            'risk_level': 'High' if prob < 0.6 else 'Medium' if prob < 0.8 else 'Low',
            'explanation': explanation
        }

    def get_explanation(self, features):
        """
        Generates SHAP explanations for the ensemble.
        """
        import shap
        try:
            # For VotingClassifier, we can use KernelExplainer or explain individual models
            # Here we use KernelExplainer on the soft voting probability
            def predict_fn(x):
                # Ensure x is a DataFrame with correct feature names
                df_x = pd.DataFrame(x, columns=features.columns)
                return self.model.predict_proba(df_x)[:, 1]
            
            # Use a small background dataset for KernelExplainer
            # In production, this would be a sample of training data
            explainer = shap.KernelExplainer(predict_fn, np.zeros((1, len(features.columns))))
            shap_values = explainer.shap_values(features.values)
            
            feature_importance = dict(zip(features.columns, shap_values[0].tolist()))
            return feature_importance
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
            return {}

prediction_service = PredictionService()
