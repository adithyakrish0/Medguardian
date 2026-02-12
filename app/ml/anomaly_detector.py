"""
Medication Adherence Anomaly Detector

Z-score based anomaly detection for identifying unusual medication-taking patterns:
- Unusual timing (e.g., 3 AM instead of 9 AM)
- Skipping patterns (e.g., missing weekends)
- Sudden adherence drops (e.g., 95% → 60%)

Supports tunable sensitivity: high=2.0, medium=2.5, low=3.0 (Z-score thresholds)
"""

import numpy as np
import pickle
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class AnomalyType(Enum):
    UNUSUAL_TIMING = "unusual_timing"
    SKIPPING_PATTERN = "skipping_pattern"
    ADHERENCE_DROP = "adherence_drop"


class Sensitivity(Enum):
    HIGH = 2.0      # More sensitive, more alerts
    MEDIUM = 2.5    # Balanced
    LOW = 3.0       # Less sensitive, fewer alerts


@dataclass
class AnomalyResult:
    """Result of anomaly detection"""
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: Optional[str]
    alert_message: str
    details: Dict
    detected_at: datetime
    
    def to_dict(self) -> Dict:
        return {
            'is_anomaly': self.is_anomaly,
            'anomaly_score': round(self.anomaly_score, 3),
            'anomaly_type': self.anomaly_type,
            'alert': self.alert_message,
            'details': self.details,
            'detected_at': self.detected_at.isoformat()
        }


@dataclass
class PatientBaseline:
    """Baseline pattern for a patient"""
    patient_id: int
    mean_hour: float
    std_hour: float
    mean_adherence_rate: float
    weekday_pattern: Dict[int, float]  # day_of_week -> adherence rate
    sensitivity: Sensitivity
    sample_count: int
    trained_at: datetime
    
    def to_dict(self) -> Dict:
        return {
            'patient_id': self.patient_id,
            'mean_hour': round(self.mean_hour, 2),
            'std_hour': round(self.std_hour, 2),
            'mean_adherence_rate': round(self.mean_adherence_rate, 3),
            'weekday_pattern': self.weekday_pattern,
            'sensitivity': self.sensitivity.name.lower(),
            'sample_count': self.sample_count,
            'trained_at': self.trained_at.isoformat()
        }


class AnomalyDetector:
    """
    Z-score based anomaly detector for medication adherence patterns.
    
    Detects three types of anomalies:
    1. UNUSUAL_TIMING - Taking medication at significantly different times
    2. SKIPPING_PATTERN - Unusual patterns of missed doses
    3. ADHERENCE_DROP - Significant drop in adherence rate
    """
    
    def __init__(self, model_dir: str = None):
        """
        Initialize the anomaly detector.
        
        Args:
            model_dir: Directory to save/load baseline models
        """
        if model_dir is None:
            model_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'models', 'saved'
            )
        
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        # Store baselines in memory (loaded from disk as needed)
        self._baselines: Dict[int, PatientBaseline] = {}
        
        # Default sensitivity
        self.default_sensitivity = Sensitivity.MEDIUM
        
        # Adherence window for recent comparison
        self.recent_window_days = 7
        self.baseline_window_days = 30
    
    def _get_model_path(self, patient_id: int) -> str:
        """Get the file path for a patient's baseline model."""
        return os.path.join(self.model_dir, f'anomaly_baseline_patient_{patient_id}.pkl')
    
    def extract_features(self, logs: List[Dict]) -> Dict:
        """
        Extract features from medication logs.
        
        Args:
            logs: List of log dicts with 'taken_at', 'scheduled_time', 'status'
        
        Returns:
            Dict with extracted features
        """
        if not logs:
            return {'hours': [], 'days_of_week': [], 'adherence_by_day': {}}
        
        hours = []
        days_of_week = []
        statuses = []
        
        for log in logs:
            taken_at = log.get('taken_at')
            if isinstance(taken_at, str):
                taken_at = datetime.fromisoformat(taken_at.replace('Z', '+00:00'))
            
            if taken_at:
                hours.append(taken_at.hour + taken_at.minute / 60)
                days_of_week.append(taken_at.weekday())
            
            status = log.get('status', 'verified')
            statuses.append(1 if status == 'verified' else 0)
        
        # Calculate adherence by day of week
        adherence_by_day = {}
        for dow in range(7):
            day_statuses = [s for i, s in enumerate(statuses) if days_of_week[i] == dow if i < len(days_of_week)]
            if day_statuses:
                adherence_by_day[dow] = sum(day_statuses) / len(day_statuses)
            else:
                adherence_by_day[dow] = 1.0  # Assume good if no data
        
        return {
            'hours': hours,
            'days_of_week': days_of_week,
            'statuses': statuses,
            'adherence_by_day': adherence_by_day,
            'overall_adherence': sum(statuses) / len(statuses) if statuses else 1.0
        }
    
    def train(self, patient_id: int, logs: List[Dict], 
              sensitivity: Sensitivity = None) -> PatientBaseline:
        """
        Train a baseline model for a patient.
        
        Args:
            patient_id: The patient's ID
            logs: Historical medication logs (at least 30 days recommended)
            sensitivity: Detection sensitivity (default: MEDIUM)
        
        Returns:
            PatientBaseline object
        """
        if sensitivity is None:
            sensitivity = self.default_sensitivity
        
        features = self.extract_features(logs)
        
        hours = features['hours']
        if len(hours) < 5:
            logger.warning(f"Insufficient data for patient {patient_id}: {len(hours)} samples")
        
        # Calculate baseline statistics
        mean_hour = np.mean(hours) if hours else 9.0  # Default 9 AM
        std_hour = np.std(hours) if len(hours) > 1 else 1.0
        
        # Minimum std to avoid division by zero
        std_hour = max(std_hour, 0.5)
        
        baseline = PatientBaseline(
            patient_id=patient_id,
            mean_hour=float(mean_hour),
            std_hour=float(std_hour),
            mean_adherence_rate=features['overall_adherence'],
            weekday_pattern=features['adherence_by_day'],
            sensitivity=sensitivity,
            sample_count=len(logs),
            trained_at=datetime.utcnow()
        )
        
        # Cache and save
        self._baselines[patient_id] = baseline
        self._save_baseline(baseline)
        
        logger.info(f"Trained baseline for patient {patient_id}: "
                   f"mean_hour={mean_hour:.1f}, std={std_hour:.2f}, "
                   f"adherence={features['overall_adherence']:.1%}")
        
        return baseline
    
    def _save_baseline(self, baseline: PatientBaseline):
        """Save baseline to disk."""
        path = self._get_model_path(baseline.patient_id)
        with open(path, 'wb') as f:
            pickle.dump(baseline, f)
        logger.debug(f"Saved baseline to {path}")
    
    def _load_baseline(self, patient_id: int) -> Optional[PatientBaseline]:
        """Load baseline from disk."""
        path = self._get_model_path(patient_id)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                baseline = pickle.load(f)
                self._baselines[patient_id] = baseline
                return baseline
        return None
    
    def get_baseline(self, patient_id: int) -> Optional[PatientBaseline]:
        """Get baseline for a patient (from cache or disk)."""
        if patient_id in self._baselines:
            return self._baselines[patient_id]
        return self._load_baseline(patient_id)
    
    def configure_sensitivity(self, patient_id: int, sensitivity: str) -> bool:
        """
        Update sensitivity for a patient.
        
        Args:
            patient_id: Patient ID
            sensitivity: 'high', 'medium', or 'low'
        
        Returns:
            True if successful
        """
        baseline = self.get_baseline(patient_id)
        if not baseline:
            return False
        
        sensitivity_map = {
            'high': Sensitivity.HIGH,
            'medium': Sensitivity.MEDIUM,
            'low': Sensitivity.LOW
        }
        
        new_sensitivity = sensitivity_map.get(sensitivity.lower())
        if not new_sensitivity:
            return False
        
        baseline.sensitivity = new_sensitivity
        self._save_baseline(baseline)
        logger.info(f"Updated sensitivity for patient {patient_id} to {sensitivity}")
        return True
    
    def detect(self, patient_id: int, recent_logs: List[Dict]) -> AnomalyResult:
        """
        Detect anomalies in recent logs.
        
        Args:
            patient_id: Patient ID
            recent_logs: Recent medication logs (last 7 days)
        
        Returns:
            AnomalyResult with detection details
        """
        baseline = self.get_baseline(patient_id)
        
        if not baseline:
            return AnomalyResult(
                is_anomaly=False,
                anomaly_score=0.0,
                anomaly_type=None,
                alert_message="No baseline model found. Please train first.",
                details={'error': 'no_baseline'},
                detected_at=datetime.utcnow()
            )
        
        if not recent_logs:
            return AnomalyResult(
                is_anomaly=False,
                anomaly_score=0.0,
                anomaly_type=None,
                alert_message="No recent logs to analyze.",
                details={'error': 'no_data'},
                detected_at=datetime.utcnow()
            )
        
        features = self.extract_features(recent_logs)
        threshold = baseline.sensitivity.value
        
        anomalies = []
        max_score = 0.0
        
        # Check 1: Unusual Timing
        if features['hours']:
            hour_z_scores = [(h - baseline.mean_hour) / baseline.std_hour 
                           for h in features['hours']]
            max_timing_z = max(abs(z) for z in hour_z_scores)
            
            if max_timing_z > threshold:
                anomalies.append({
                    'type': AnomalyType.UNUSUAL_TIMING,
                    'score': max_timing_z,
                    'details': {
                        'expected_time': f"{int(baseline.mean_hour)}:{int((baseline.mean_hour % 1) * 60):02d}",
                        'deviation_hours': round((max_timing_z * baseline.std_hour), 1),
                        'observed_hours': [round(h, 1) for h in features['hours'][-3:]]
                    }
                })
                max_score = max(max_score, max_timing_z)
        
        # Check 2: Adherence Drop
        if len(features['statuses']) >= 3:
            recent_adherence = features['overall_adherence']
            baseline_adherence = baseline.mean_adherence_rate
            
            if baseline_adherence > 0:
                adherence_drop = (baseline_adherence - recent_adherence) / baseline_adherence
                
                # Use a scaled threshold for adherence (20% drop at medium sensitivity)
                adherence_threshold = 0.15 + (0.05 * threshold)
                
                if adherence_drop > adherence_threshold:
                    adherence_score = adherence_drop * 10  # Scale to comparable range
                    anomalies.append({
                        'type': AnomalyType.ADHERENCE_DROP,
                        'score': adherence_score,
                        'details': {
                            'baseline_adherence': f"{baseline_adherence:.0%}",
                            'recent_adherence': f"{recent_adherence:.0%}",
                            'drop_percentage': f"{adherence_drop:.0%}"
                        }
                    })
                    max_score = max(max_score, adherence_score)
        
        # Check 3: Skipping Pattern
        if features['adherence_by_day']:
            skipping_days = []
            for dow, adherence in features['adherence_by_day'].items():
                baseline_dow_adherence = baseline.weekday_pattern.get(dow, 1.0)
                
                if baseline_dow_adherence > 0.5 and adherence < 0.3:
                    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    skipping_days.append(day_names[dow])
            
            if skipping_days:
                skip_score = len(skipping_days) * 1.5  # Score based on days skipped
                anomalies.append({
                    'type': AnomalyType.SKIPPING_PATTERN,
                    'score': skip_score,
                    'details': {
                        'skipped_days': skipping_days,
                        'pattern': 'weekend' if set(skipping_days) <= {'Sat', 'Sun'} else 'irregular'
                    }
                })
                max_score = max(max_score, skip_score)
        
        # Determine primary anomaly
        if anomalies:
            anomalies.sort(key=lambda x: x['score'], reverse=True)
            primary = anomalies[0]
            
            # Generate alert message
            alert_messages = {
                AnomalyType.UNUSUAL_TIMING: 
                    f"Unusual medication timing detected - possible confusion. "
                    f"Expected around {primary['details'].get('expected_time', 'N/A')}, "
                    f"but observed doses at unusual hours.",
                AnomalyType.ADHERENCE_DROP:
                    f"Significant adherence decline detected. "
                    f"Dropped from {primary['details'].get('baseline_adherence', 'N/A')} "
                    f"to {primary['details'].get('recent_adherence', 'N/A')}.",
                AnomalyType.SKIPPING_PATTERN:
                    f"Consistent skipping pattern detected. "
                    f"Missing doses on: {', '.join(primary['details'].get('skipped_days', []))}."
            }
            
            return AnomalyResult(
                is_anomaly=True,
                anomaly_score=max_score,
                anomaly_type=primary['type'].value,
                alert_message=alert_messages[primary['type']],
                details={
                    'primary_anomaly': primary,
                    'all_anomalies': [{
                        'type': a['type'].value,
                        'score': round(a['score'], 2),
                        'details': a['details']
                    } for a in anomalies],
                    'baseline': baseline.to_dict(),
                    'threshold': threshold
                },
                detected_at=datetime.utcnow()
            )
        
        return AnomalyResult(
            is_anomaly=False,
            anomaly_score=max_score,
            anomaly_type=None,
            alert_message="No anomalies detected. Adherence patterns are normal.",
            details={
                'baseline': baseline.to_dict(),
                'recent_features': {
                    'mean_hour': round(np.mean(features['hours']), 1) if features['hours'] else None,
                    'adherence': f"{features['overall_adherence']:.0%}"
                }
            },
            detected_at=datetime.utcnow()
        )
    
    def detect_for_all_patients(self, get_logs_func) -> List[AnomalyResult]:
        """
        Run detection for all patients with baselines.
        
        Args:
            get_logs_func: Function(patient_id) -> List[Dict] to fetch recent logs
        
        Returns:
            List of AnomalyResult for patients with anomalies
        """
        results = []
        
        # Find all baseline files
        baseline_files = [f for f in os.listdir(self.model_dir) 
                        if f.startswith('anomaly_baseline_patient_')]
        
        for filename in baseline_files:
            try:
                patient_id = int(filename.split('_')[-1].replace('.pkl', ''))
                logs = get_logs_func(patient_id)
                result = self.detect(patient_id, logs)
                
                if result.is_anomaly:
                    results.append(result)
                    logger.info(f"Anomaly detected for patient {patient_id}: {result.anomaly_type}")
                    
            except Exception as e:
                logger.error(f"Error processing {filename}: {e}")
                continue
        
        return results


# Singleton instance
anomaly_detector = AnomalyDetector()
