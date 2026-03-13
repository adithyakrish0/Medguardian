import numpy as np
import pandas as pd
import pickle
import os
import logging

logger = logging.getLogger(__name__)

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("⚠️  XGBoost not available")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    logger.warning("⚠️  LightGBM not available — Ensemble will use RF+XGBoost only")

from sklearn.ensemble import RandomForestClassifier, VotingClassifier
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

class EnsembleAdherencePredictor:
    """
    SOTA Ensemble model for medication adherence prediction.
    Combines Random Forest, XGBoost, and LightGBM using weighted soft voting.
    """
    def __init__(self):
        self.rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        self.xgb = xgb.XGBClassifier(n_estimators=150, learning_rate=0.05, max_depth=6, random_state=42) if XGBOOST_AVAILABLE else None
        self.lgb = lgb.LGBMClassifier(n_estimators=150, learning_rate=0.05, max_depth=6, random_state=42, verbose=-1) if LIGHTGBM_AVAILABLE else None
        
        self.ensemble = None
        self.weights = [1.0, 1.0, 1.0] if LIGHTGBM_AVAILABLE else [1.0, 1.0]

    def train(self, X, y, X_val=None, y_val=None):
        """
        Trains the individual models and the ensemble.
        If validation data is provided, it calculates weights based on accuracy.
        """
        logger.info("Training Ensemble components...")
        
        self.rf.fit(X, y)
        self.xgb.fit(X, y)
        self.lgb.fit(X, y)
        
        if X_val is not None and y_val is not None:
            rf_score = self.rf.score(X_val, y_val)
            xgb_score = self.xgb.score(X_val, y_val)
            lgb_score = self.lgb.score(X_val, y_val)
            
            logger.info(f"Validation Scores - RF: {rf_score:.4f}, XGB: {xgb_score:.4f}, LGB: {lgb_score:.4f}")
            
            # Use accuracy as weights (normalized)
            raw_weights = [rf_score, xgb_score, lgb_score]
            self.weights = [w / sum(raw_weights) for w in raw_weights]
            logger.info(f"Ensemble weights: {self.weights}")

        self.ensemble = VotingClassifier(
            estimators=[
                ('rf', self.rf),
                ('xgb', self.xgb),
                ('lgb', self.lgb)
            ],
            voting='soft',
            weights=self.weights
        )
        
        # Fit the ensemble wrapper (it re-fits internally but we've already initialized components)
        self.ensemble.fit(X, y)
        return self.ensemble

    def predict_proba(self, X):
        if self.ensemble is None:
            raise ValueError("Model not trained yet.")
        return self.ensemble.predict_proba(X)

    def get_explanations(self, X):
        """
        Generates SHAP values for the ensemble to explain feature importance.
        For ensembles, we usually explain the individual component models and average.
        """
        if self.ensemble is None:
            return {}
            
        explanations = []
        
        # Explain each component
        # Note: Explaining VotingClassifier directly is complex with SHAP, 
        # so we explain the most influential component (usually XGB or RF) 
        # or aggregate them.
        
        # Using TreeExplainer for XGBoost component
        explainer = shap.TreeExplainer(self.xgb)
        shap_values = explainer.shap_values(X)
        
        # Convert to list for JSON serialization
        if isinstance(shap_values, list):
            # For multi-class, take the positive class (adherent)
            values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            values = shap_values
            
        return {
            'shap_values': values.tolist(),
            'feature_names': X.columns.tolist() if hasattr(X, 'columns') else [f"feature_{i}" for i in range(values.shape[1])],
            'base_value': float(explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value)
        }

    def save(self, model_path):
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        with open(model_path, 'wb') as f:
            pickle.dump({
                'ensemble': self.ensemble,
                'weights': self.weights
            }, f)
        logger.info(f"Ensemble model saved to {model_path}")

    @classmethod
    def load(cls, model_path):
        if not os.path.exists(model_path):
            return None
        
        with open(model_path, 'rb') as f:
            data = pickle.load(f)
            
        instance = cls()
        instance.ensemble = data['ensemble']
        instance.weights = data['weights']
        return instance
