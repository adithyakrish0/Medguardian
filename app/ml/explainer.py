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
    Uses TreeExplainer for efficient exact SHAP values on RandomForest.
    """
    
    FEATURE_NAMES = ['hour', 'day_of_week', 'is_weekend', 'priority']
    FEATURE_DESCRIPTIONS = {
        'hour': 'Scheduled Hour',
        'day_of_week': 'Day of Week',
        'is_weekend': 'Is Weekend',
        'priority': 'Medication Priority'
    }
    
    def __init__(self, model=None, model_path: str = None):
        """
        Initialize explainer with a trained model.
        
        Args:
            model: Trained sklearn model (RandomForest)
            model_path: Path to pickled model file
        """
        self.model = model
        self.explainer = None
        self.background_data = None
        
        if model_path and not model:
            self._load_model(model_path)
        
        if self.model:
            self._init_explainer()
    
    def _load_model(self, model_path: str):
        """Load model from pickle file."""
        if os.path.exists(model_path):
            try:
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
    
    def _init_explainer(self):
        """Initialize SHAP TreeExplainer."""
        try:
            # TreeExplainer is optimal for RandomForest
            self.explainer = shap.TreeExplainer(self.model)
            logger.info("SHAP TreeExplainer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
    
    def _generate_sample_background(self, n_samples: int = 100) -> pd.DataFrame:
        """Generate synthetic background data for SHAP calculations."""
        np.random.seed(42)
        return pd.DataFrame({
            'hour': np.random.randint(6, 22, n_samples),
            'day_of_week': np.random.randint(0, 7, n_samples),
            'is_weekend': np.random.choice([0, 1], n_samples, p=[0.71, 0.29]),
            'priority': np.random.choice([0, 1], n_samples, p=[0.7, 0.3])
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
        
        # Create feature DataFrame
        X = pd.DataFrame([{
            'hour': features.get('hour', 9),
            'day_of_week': features.get('day_of_week', 0),
            'is_weekend': features.get('is_weekend', 0),
            'priority': features.get('priority', 0)
        }])
        
        # Get prediction
        prob = self.model.predict_proba(X)[0][1]  # Probability of taking medication
        risk_level = 'High' if prob < 0.6 else 'Medium' if prob < 0.8 else 'Low'
        
        # Get SHAP values
        shap_values = self.explainer.shap_values(X)
        
        # For binary classifier, use positive class SHAP values
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]  # Class 1 (taken)
        else:
            shap_vals = shap_values[0]
        
        base_value = self.explainer.expected_value
        if isinstance(base_value, np.ndarray):
            base_value = base_value[1]  # Class 1
        
        # Build contributions list
        contributions = []
        for i, (name, shap_val) in enumerate(zip(self.FEATURE_NAMES, shap_vals)):
            direction = 'increases_adherence' if shap_val > 0 else 'decreases_adherence'
            contributions.append(FeatureContribution(
                name=self.FEATURE_DESCRIPTIONS.get(name, name),
                value=float(X[name].iloc[0]),
                contribution=float(shap_val),
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
            feature_names=list(self.FEATURE_DESCRIPTIONS.values())
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
        shap_values = self.explainer.shap_values(X)
        
        if isinstance(shap_values, list):
            shap_vals = shap_values[1]  # Class 1
        else:
            shap_vals = shap_values
        
        # Calculate mean absolute SHAP values
        mean_abs_shap = np.abs(shap_vals).mean(axis=0)
        
        # Rank features
        feature_importance = []
        for i, (name, importance) in enumerate(zip(self.FEATURE_NAMES, mean_abs_shap)):
            feature_importance.append({
                'rank': 0,  # Will be set after sorting
                'feature': self.FEATURE_DESCRIPTIONS.get(name, name),
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
        X_display = X.rename(columns=self.FEATURE_DESCRIPTIONS)
        
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
        model_path = 'app/services/models/adherence_model.pkl'
        _explainer_instance = AdherenceExplainer(model_path=model_path)
    return _explainer_instance
