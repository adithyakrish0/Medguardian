# app/ml/__init__.py
"""Machine Learning module for MedGuardian"""

from .anomaly_detector import AnomalyDetector, anomaly_detector

__all__ = ['AnomalyDetector', 'anomaly_detector']
