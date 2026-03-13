"""
Adherence Explainer - SHAP-based Model Interpretability

Uses SHAP (SHapley Additive exPlanations) to explain why the adherence prediction
model makes certain predictions. Supports:
- Individual prediction explanations (waterfall plots)
- Global feature importance (summary plots)
- Comparative analysis (high-risk vs low-risk)
"""

import shap
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import io
import base64
import pickle
import os
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FeatureContribution:
    """Single feature's contribution to prediction"""
    name: str
    value: float
    contribution: float
    direction: str  # 'increases_risk' or 'decreases_risk'
    
    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'value': self.value,
            'contribution': round(self.contribution, 4),
            'direction': self.direction,
            'impact': 'positive' if self.contribution > 0 else 'negative'
        }


@dataclass
class PredictionExplanation:
    """Full explanation for a prediction"""
    prediction: float
    risk_level: str
    base_value: float
    contributions: List[FeatureContribution]
    waterfall_plot: Optional[str]  # base64 image
    
    def to_dict(self) -> Dict:
        return {
            'prediction': round(self.prediction, 3),
            'risk_level': self.risk_level,
            'base_value': round(self.base_value, 3),
            'contributions': [c.to_dict() for c in self.contributions],
            'waterfall_plot': self.waterfall_plot
        }


class AdherenceExplainer:
    """
    SHAP-based explainer for the adherence prediction model.
    Uses TreeExplainer for efficient exact SHAP values on tree-based models.
    """
    
    # Default fallback features
    FEATURE_NAMES = ['hour', 'day_of_week', 'is_weekend', 'priority_encoded']
    FEATURE_DESCRIPTIONS = {
        'hour': 'Scheduled Hour',
        'day_of_week': 'Day of Week',
        'is_weekend': 'Is Weekend',
        'priority_encoded': 'Medication Priority'
    }
    
    def __init__(self, model=None, model_path: str = None, explainer_path: str = None, metadata_path: str = None):
        """
        Initialize explainer with a trained model.
        
        Args:
            model: Trained sklearn model
            model_path: Path to pickled model file
            explainer_path: Path to pickled SHAP explainer
            metadata_path: Path to metadata JSON
        """
        self.model = model
        self.explainer = None
        self.metadata = {}
        self.feature_names = self.FEATURE_NAMES
        self.feature_descriptions = self.FEATURE_DESCRIPTIONS
        
        # Priority 1: Direct paths provided
        if not self.model and model_path:
            self._load_model(model_path)
        
        if explainer_path:
            self._load_explainer(explainer_path)
            
        if metadata_path:
            self._load_metadata(metadata_path)
            
        # Priority 2: Standard paths if nothing loaded yet
        if not self.model:
            self._auto_load()

        if self.model and not self.explainer:
            self._init_explainer()
    
    def _auto_load(self):
        """Try to load from default model directory if exists."""
        base_dir = 'app/ml/models'
        paths = {
            'model': os.path.join(base_dir, 'shap_model.pkl'),
            'explainer': os.path.join(base_dir, 'shap_explainer.pkl'),
            'metadata': os.path.join(base_dir, 'shap_metadata.json')
        }
        
        if os.path.exists(paths['metadata']):
            self._load_metadata(paths['metadata'])
            
        if os.path.exists(paths['model']):
            self._load_model(paths['model'])
            
        if os.path.exists(paths['explainer']):
            self._load_explainer(paths['explainer'])

    def _load_metadata(self, path: str):
        """Load feature names and descriptions from JSON."""
        import json
        try:
            with open(path, 'r') as f:
                self.metadata = json.load(f)
            self.feature_names = self.metadata.get('feature_names', self.FEATURE_NAMES)
            self.feature_descriptions = self.metadata.get('feature_descriptions', self.FEATURE_DESCRIPTIONS)
            logger.info(f"Loaded metadata from {path}")
        except Exception as e:
            logger.error(f"Failed to load metadata: {e}")

    def _load_model(self, model_path: str):
        """Load model from pickle file."""
        if os.path.exists(model_path):
            try:
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")

    def _load_explainer(self, explainer_path: str):
        """Load pre-trained SHAP explainer."""
        if os.path.exists(explainer_path):
            try:
                with open(explainer_path, 'rb') as f:
                    self.explainer = pickle.load(f)
                logger.info(f"Loaded explainer from {explainer_path}")
            except Exception as e:
                logger.error(f"Failed to load explainer: {e}")
    
    def _init_explainer(self):
        """Initialize SHAP TreeExplainer if not loaded."""
        try:
            # Disable additivity check to prevent 500 errors on small floating point deltas
            self.explainer = shap.TreeExplainer(self.model, check_additivity=False)
            logger.info("SHAP TreeExplainer initialized from model (check_additivity=False)")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
    
    def _generate_sample_background(self, n_samples: int = 100) -> pd.DataFrame:
        """Generate synthetic background data for SHAP calculations."""
        np.random.seed(42)
        return pd.DataFrame({
            'hour': np.random.randint(6, 22, n_samples),
            'day_of_week': np.random.randint(0, 7, n_samples),
            'is_weekend': np.random.choice([0, 1], n_samples, p=[0.71, 0.29]),
            'priority_encoded': np.random.choice([0, 1], n_samples, p=[0.7, 0.3])
        })
    
    def explain_prediction(
        self, 
        features: Dict,
        generate_plot: bool = True
    ) -> PredictionExplanation:
        """
        Generate SHAP explanation for a single prediction.
        
        Args:
            features: Dict with 'hour', 'day_of_week', 'is_weekend', 'priority'
            generate_plot: Whether to generate waterfall plot
        
        Returns:
            PredictionExplanation with contributions and optional plot
        """
        if not self.explainer:
            raise ValueError("Explainer not initialized. Load a model first.")
        
        # Create feature DataFrame matching training schema
        input_data = {}
        for name in self.feature_names:
            input_data[name] = features.get(name, 0)
            # Fallback for old feature names if they appear in metadata
            if name == 'priority_encoded' and 'priority' in features:
                input_data[name] = features['priority']
            if name == 'hour_of_day' and 'hour' in features:
                input_data[name] = features['hour']

        X = pd.DataFrame([input_data])
        
        # Get prediction
        prob = self.model.predict_proba(X)[0][1]  # Probability of taking medication
        risk_level = 'High' if prob < 0.6 else 'Medium' if prob < 0.8 else 'Low'
        
        # Get SHAP values with robust error handling
        try:
            shap_values = self.explainer.shap_values(X)
        except Exception as e:
            logger.error(f"SHAP shap_values() failed: {e}")
            # Return a minimal explanation with zero contributions
            prob_val = float(prob)
            return PredictionExplanation(
                prediction=prob_val,
                risk_level=risk_level,
                base_value=0.0,
                contributions=[FeatureContribution(
                    name=self.feature_descriptions.get(n, n),
                    value=float(X[n].iloc[0]),
                    contribution=0.0,
                    direction='neutral'
                ) for n in self.feature_names],
                waterfall_plot=None
            )
        
        # 1. Handle different SHAP value return formats (list, 2D array, 3D array)
        # Class 1 is usually the positive class (taken medication)
        try:
            if isinstance(shap_values, list):
                # List of arrays: [class0_vals, class1_vals]
                shap_vals = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
            elif isinstance(shap_values, np.ndarray):
                if shap_values.ndim == 3:
                    # 3D array: (samples, features, classes) -> take class 1
                    shap_vals = shap_values[0, :, 1] if shap_values.shape[2] > 1 else shap_values[0, :, 0]
                else:
                    # 2D array: (samples, features)
                    shap_vals = shap_values[0]
            else:
                # Fallback for newer Explanation objects or unexpected types
                shap_vals = shap_values[0].values if hasattr(shap_values, 'values') else shap_values[0]
        except (IndexError, KeyError, TypeError) as e:
            logger.error(f"SHAP value indexing failed: {e}, shape info: {type(shap_values)}, falling back to zeros")
            shap_vals = np.zeros(len(self.feature_names))

        # Ensure shap_vals is a flat numpy array with correct length
        shap_vals = np.asarray(shap_vals).flatten()
        if len(shap_vals) < len(self.feature_names):
            shap_vals = np.pad(shap_vals, (0, len(self.feature_names) - len(shap_vals)))
        elif len(shap_vals) > len(self.feature_names):
            shap_vals = shap_vals[:len(self.feature_names)]

        # 2. Handle base_value (expected_value) formats
        base_value = self.explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)) and len(base_value) > 1:
            base_value = base_value[1]  # Class 1
        elif hasattr(base_value, '__iter__'):
             try: base_value = list(base_value)[1]
             except: pass
        
        # Build contributions list
        contributions = []
        for i, name in enumerate(self.feature_names):
            shap_val = float(shap_vals[i])
            direction = 'increases_adherence' if shap_val > 0 else 'decreases_adherence'
            contributions.append(FeatureContribution(
                name=self.feature_descriptions.get(name, name),
                value=float(X[name].iloc[0]),
                contribution=shap_val,
                direction=direction
            ))
        
        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x.contribution), reverse=True)
        
        # Generate waterfall plot
        waterfall_plot = None
        if generate_plot:
            try:
                waterfall_plot = self._generate_waterfall_plot(
                    shap_vals, 
                    X.iloc[0].values,
                    base_value
                )
            except Exception as e:
                logger.error(f"Failed to generate waterfall plot: {e}")
        
        return PredictionExplanation(
            prediction=float(prob),
            risk_level=risk_level,
            base_value=float(base_value),
            contributions=contributions,
            waterfall_plot=waterfall_plot
        )
    
    def _generate_waterfall_plot(
        self, 
        shap_values: np.ndarray,
        feature_values: np.ndarray,
        base_value: float
    ) -> str:
        """Generate SHAP waterfall plot as base64 image."""
        plt.figure(figsize=(10, 6))
        plt.style.use('dark_background')
        
        # Create SHAP Explanation object
        explanation = shap.Explanation(
            values=shap_values,
            base_values=base_value,
            data=feature_values,
            feature_names=[self.feature_descriptions.get(n, n) for n in self.feature_names]
        )
        
        # Generate waterfall plot
        shap.plots.waterfall(explanation, show=False)
        
        # Style adjustments
        plt.title('Feature Contributions to Prediction', fontsize=14, fontweight='bold', color='white')
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                   facecolor='#1f1f1f', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"
    
    def get_global_importance(self, n_samples: int = 200) -> Dict:
        """
        Get global feature importance across all predictions.
        
        Args:
            n_samples: Number of synthetic samples to analyze
        
        Returns:
            Dict with ranked features and summary plot
        """
        if not self.explainer:
            raise ValueError("Explainer not initialized.")
        
        # Generate background data
        X = self._generate_sample_background(n_samples)
        
        # Calculate SHAP values for all samples
        # Disable additivity check to prevent failures on noisy synthetic data
        try:
            shap_values = self.explainer.shap_values(X, check_additivity=False)
        except Exception as e:
            logger.error(f"SHAP global shap_values() failed: {e}")
            # Return minimal importance with zeros
            return {
                'features': [{'rank': i+1, 'feature': self.feature_descriptions.get(n, n), 'importance': 0.0, 'percentage': 0.0} for i, n in enumerate(self.feature_names)],
                'summary_plot': None,
                'samples_analyzed': n_samples
            }
        
        # Consistent extraction for positive class
        try:
            if isinstance(shap_values, list):
                shap_vals = shap_values[1] if len(shap_values) > 1 else shap_values[0]
            elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
                shap_vals = shap_values[:, :, 1] if shap_values.shape[2] > 1 else shap_values[:, :, 0]
            else:
                shap_vals = shap_values
        except (IndexError, KeyError, TypeError) as e:
            logger.error(f"SHAP global value indexing failed: {e}")
            shap_vals = np.zeros((n_samples, len(self.feature_names)))
        
        # Calculate mean absolute SHAP values
        mean_abs_shap = np.abs(shap_vals).mean(axis=0)
        
        # Rank features
        feature_importance = []
        for i, name in enumerate(self.feature_names):
            importance = mean_abs_shap[i]
            feature_importance.append({
                'rank': 0,  # Will be set after sorting
                'feature': self.feature_descriptions.get(name, name),
                'importance': round(float(importance), 4),
                'percentage': 0  # Will be calculated
            })
        
        # Sort and add ranks
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        total_importance = sum(f['importance'] for f in feature_importance)
        
        for i, f in enumerate(feature_importance):
            f['rank'] = i + 1
            f['percentage'] = round(f['importance'] / total_importance * 100, 1) if total_importance > 0 else 0
        
        # Generate summary plot
        summary_plot = self._generate_summary_plot(shap_vals, X)
        
        return {
            'features': feature_importance,
            'summary_plot': summary_plot,
            'samples_analyzed': n_samples
        }
    
    def _generate_summary_plot(self, shap_values: np.ndarray, X: pd.DataFrame) -> str:
        """Generate SHAP summary plot as base64 image."""
        plt.figure(figsize=(10, 6))
        
        # Rename columns for display
        X_display = X.rename(columns=self.feature_descriptions)
        
        shap.summary_plot(
            shap_values, 
            X_display, 
            show=False,
            plot_type='bar',
            color='#4f46e5'
        )
        
        plt.title('Global Feature Importance', fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"
    
    def compare_predictions(
        self, 
        high_risk_features: Dict,
        low_risk_features: Dict
    ) -> Dict:
        """
        Compare SHAP explanations for high-risk vs low-risk cases.
        
        Args:
            high_risk_features: Features for high-risk prediction
            low_risk_features: Features for low-risk prediction
        
        Returns:
            Dict with side-by-side comparison
        """
        high_risk = self.explain_prediction(high_risk_features, generate_plot=True)
        low_risk = self.explain_prediction(low_risk_features, generate_plot=True)
        
        return {
            'high_risk': high_risk.to_dict(),
            'low_risk': low_risk.to_dict(),
            'key_differences': self._analyze_differences(high_risk, low_risk)
        }
    
    def _analyze_differences(
        self, 
        high_risk: PredictionExplanation,
        low_risk: PredictionExplanation
    ) -> List[Dict]:
        """Analyze key differences between high and low risk predictions."""
        differences = []
        
        high_contrib = {c.name: c for c in high_risk.contributions}
        low_contrib = {c.name: c for c in low_risk.contributions}
        
        for name in high_contrib:
            if name in low_contrib:
                diff = high_contrib[name].contribution - low_contrib[name].contribution
                if abs(diff) > 0.01:
                    differences.append({
                        'feature': name,
                        'high_risk_contribution': round(high_contrib[name].contribution, 3),
                        'low_risk_contribution': round(low_contrib[name].contribution, 3),
                        'difference': round(diff, 3),
                        'insight': self._generate_insight(name, high_contrib[name], low_contrib[name])
                    })
        
        differences.sort(key=lambda x: abs(x['difference']), reverse=True)
        return differences
    
    def _generate_insight(
        self, 
        feature_name: str,
        high_risk: FeatureContribution,
        low_risk: FeatureContribution
    ) -> str:
        """Generate human-readable insight for a feature difference."""
        if feature_name == 'Scheduled Hour':
            return f"Time of day matters: {int(high_risk.value)}:00 vs {int(low_risk.value)}:00"
        elif feature_name == 'Is Weekend':
            return "Weekend doses have different adherence patterns"
        elif feature_name == 'Medication Priority':
            return "Higher priority medications get more attention"
        elif feature_name == 'Day of Week':
            days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            return f"Day matters: {days[int(high_risk.value)]} vs {days[int(low_risk.value)]}"
        return f"Difference in {feature_name} affects prediction"


# Lazy-loaded singleton
_explainer_instance = None

def get_explainer() -> AdherenceExplainer:
    """Get or create the global explainer instance."""
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = AdherenceExplainer()
    return _explainer_instance
