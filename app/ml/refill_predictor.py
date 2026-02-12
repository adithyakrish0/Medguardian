"""
Refill Predictor - Linear Time-Series Forecasting

Predicts when medications will run out based on consumption patterns.
Uses linear extrapolation for MVP, can upgrade to Prophet later.
"""

import numpy as np
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class RefillPrediction:
    """Prediction for a single medication."""
    medication_id: int
    medication_name: str
    quantity_remaining: int
    initial_quantity: Optional[int]
    avg_daily_consumption: float
    consumption_variance: float
    days_remaining: int
    predicted_depletion_date: date
    confidence_interval: Tuple[date, date]
    alert_level: str  # 'critical', 'warning', 'info', 'none'
    forecast_method: str
    last_refill_date: Optional[date]
    days_of_history: int
    is_prn: bool
    
    def to_dict(self) -> Dict:
        return {
            'medication_id': self.medication_id,
            'name': self.medication_name,
            'quantity_remaining': self.quantity_remaining,
            'initial_quantity': self.initial_quantity,
            'avg_daily_consumption': round(self.avg_daily_consumption, 2),
            'consumption_variance': round(self.consumption_variance, 3),
            'days_remaining': self.days_remaining,
            'predicted_depletion_date': self.predicted_depletion_date.isoformat(),
            'confidence_interval': [
                self.confidence_interval[0].isoformat(),
                self.confidence_interval[1].isoformat()
            ],
            'alert_level': self.alert_level,
            'forecast_method': self.forecast_method,
            'last_refill_date': self.last_refill_date.isoformat() if self.last_refill_date else None,
            'days_of_history': self.days_of_history,
            'is_prn': self.is_prn
        }


class RefillPredictor:
    """
    Linear extrapolation-based refill predictor.
    
    Algorithm:
    1. Calculate average daily consumption from medication logs
    2. Divide quantity_remaining by avg_daily_consumption
    3. Add confidence interval based on consumption variance
    """
    
    # Alert thresholds (days remaining)
    CRITICAL_THRESHOLD = 2
    WARNING_THRESHOLD = 4
    INFO_THRESHOLD = 7
    
    def __init__(self):
        self.cache = {}  # Simple in-memory cache
    
    def predict_for_patient(self, patient_id: int) -> Dict:
        """
        Generate refill predictions for all medications of a patient.
        
        Returns:
            Dict with medications list and summary
        """
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        
        # Get active medications with quantity tracking
        medications = Medication.query.filter(
            Medication.user_id == patient_id,
            Medication.quantity_remaining.isnot(None)
        ).all()
        
        predictions = []
        total_alerts = 0
        
        for med in medications:
            prediction = self._predict_medication(med, patient_id)
            if prediction:
                predictions.append(prediction)
                if prediction.alert_level != 'none':
                    total_alerts += 1
        
        # Sort by days remaining (soonest first)
        predictions.sort(key=lambda p: p.days_remaining)
        
        return {
            'patient_id': patient_id,
            'medications': [p.to_dict() for p in predictions],
            'total_medications': len(predictions),
            'total_alerts': total_alerts,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def _predict_medication(self, medication, patient_id: int) -> Optional[RefillPrediction]:
        """Generate prediction for a single medication."""
        from app.models.medication_log import MedicationLog
        
        # Skip if no quantity info
        if medication.quantity_remaining is None:
            return None
        
        # Get consumption history (last 30 days)
        cutoff = datetime.utcnow() - timedelta(days=30)
        logs = MedicationLog.query.filter(
            MedicationLog.medication_id == medication.id,
            MedicationLog.user_id == patient_id,
            MedicationLog.status == 'verified',  # Only count taken doses
            MedicationLog.taken_at >= cutoff
        ).order_by(MedicationLog.taken_at.asc()).all()
        
        # Calculate daily consumption
        daily_consumption = self._calculate_daily_consumption(logs)
        days_of_history = len(daily_consumption)
        
        if days_of_history == 0:
            # No history - estimate from frequency
            avg_daily = self._estimate_from_frequency(medication)
            variance = 0.5  # High uncertainty
        else:
            avg_daily = np.mean(daily_consumption) if daily_consumption else 1.0
            variance = np.std(daily_consumption) if len(daily_consumption) > 1 else 0.3
        
        # Prevent division by zero
        avg_daily = max(avg_daily, 0.1)
        
        # Calculate days remaining
        days_remaining = int(medication.quantity_remaining / avg_daily)
        days_remaining = max(0, days_remaining)  # Can't be negative
        
        # Predicted depletion date
        today = date.today()
        predicted_depletion = today + timedelta(days=days_remaining)
        
        # Confidence interval based on variance
        variance_days = int(variance * days_remaining / avg_daily) if avg_daily > 0 else 1
        variance_days = max(1, min(variance_days, 7))  # Clamp to 1-7 days
        
        confidence_low = predicted_depletion - timedelta(days=variance_days)
        confidence_high = predicted_depletion + timedelta(days=variance_days)
        
        # Determine alert level
        alert_level = self._get_alert_level(days_remaining)
        
        return RefillPrediction(
            medication_id=medication.id,
            medication_name=medication.name,
            quantity_remaining=medication.quantity_remaining,
            initial_quantity=medication.initial_quantity,
            avg_daily_consumption=avg_daily,
            consumption_variance=variance,
            days_remaining=days_remaining,
            predicted_depletion_date=predicted_depletion,
            confidence_interval=(confidence_low, confidence_high),
            alert_level=alert_level,
            forecast_method='linear',
            last_refill_date=medication.last_refill_date,
            days_of_history=days_of_history,
            is_prn=medication.is_prn or False
        )
    
    def _calculate_daily_consumption(self, logs) -> List[float]:
        """
        Calculate daily consumption from logs.
        Groups by date and counts doses per day.
        """
        if not logs:
            return []
        
        daily_counts = {}
        for log in logs:
            log_date = log.taken_at.date()
            daily_counts[log_date] = daily_counts.get(log_date, 0) + 1
        
        # Fill in missing days with 0
        if daily_counts:
            start_date = min(daily_counts.keys())
            end_date = max(daily_counts.keys())
            current = start_date
            filled = []
            while current <= end_date:
                filled.append(daily_counts.get(current, 0))
                current += timedelta(days=1)
            return filled
        
        return list(daily_counts.values())
    
    def _estimate_from_frequency(self, medication) -> float:
        """Estimate daily consumption from medication frequency."""
        # Count doses per day based on time slots
        doses = 0
        if medication.morning:
            doses += 1
        if medication.afternoon:
            doses += 1
        if medication.evening:
            doses += 1
        if medication.night:
            doses += 1
        
        # Parse custom times
        if medication.custom_reminder_times:
            try:
                import json
                custom = json.loads(medication.custom_reminder_times)
                if isinstance(custom, list):
                    doses += len(custom)
            except:
                pass
        
        return max(doses, 1.0)  # At least 1 dose per day
    
    def _get_alert_level(self, days_remaining: int) -> str:
        """Determine alert level based on days remaining."""
        if days_remaining <= self.CRITICAL_THRESHOLD:
            return 'critical'
        elif days_remaining <= self.WARNING_THRESHOLD:
            return 'warning'
        elif days_remaining <= self.INFO_THRESHOLD:
            return 'info'
        return 'none'
    
    def check_and_create_alerts(self, patient_id: int) -> List[Dict]:
        """
        Check predictions and create alerts where needed.
        Prevents duplicate alerts within 24 hours.
        """
        from app.models.refill_alert import RefillAlert
        from app.models.medication import Medication
        from app.extensions import db
        
        predictions = self.predict_for_patient(patient_id)
        created_alerts = []
        
        for med_pred in predictions['medications']:
            if med_pred['alert_level'] == 'none':
                continue
            
            # Check for recent alert
            recent = RefillAlert.get_recent_for_medication(
                med_pred['medication_id'], 
                hours=24
            )
            if recent:
                continue
            
            # Create new alert
            alert = RefillAlert(
                patient_id=patient_id,
                medication_id=med_pred['medication_id'],
                alert_level=med_pred['alert_level'],
                days_remaining=med_pred['days_remaining'],
                predicted_depletion_date=date.fromisoformat(med_pred['predicted_depletion_date']),
                forecast_method=med_pred['forecast_method'],
                confidence_low=date.fromisoformat(med_pred['confidence_interval'][0]),
                confidence_high=date.fromisoformat(med_pred['confidence_interval'][1]),
                avg_daily_consumption=med_pred['avg_daily_consumption']
            )
            
            db.session.add(alert)
            created_alerts.append({
                'medication_name': med_pred['name'],
                'alert_level': med_pred['alert_level'],
                'days_remaining': med_pred['days_remaining']
            })
        
        if created_alerts:
            db.session.commit()
        
        return created_alerts
    
    def handle_refill(self, medication_id: int, new_quantity: int) -> Dict:
        """
        Handle medication refill - update quantity and auto-resolve alerts.
        
        Args:
            medication_id: ID of medication refilled
            new_quantity: New quantity after refill
        
        Returns:
            Dict with update status
        """
        from app.models.medication import Medication
        from app.models.refill_alert import RefillAlert
        from app.extensions import db
        
        medication = Medication.query.get(medication_id)
        if not medication:
            return {'success': False, 'error': 'Medication not found'}
        
        # Update medication
        medication.quantity_remaining = new_quantity
        medication.initial_quantity = new_quantity
        medication.last_refill_date = date.today()
        
        # Auto-resolve active alerts for this medication
        active_alerts = RefillAlert.query.filter(
            RefillAlert.medication_id == medication_id,
            RefillAlert.acknowledged == False,
            RefillAlert.auto_resolved == False
        ).all()
        
        resolved_count = 0
        for alert in active_alerts:
            alert.auto_resolved = True
            alert.resolved_at = datetime.utcnow()
            resolved_count += 1
        
        db.session.commit()
        
        return {
            'success': True,
            'medication_id': medication_id,
            'new_quantity': new_quantity,
            'auto_resolved_alerts': resolved_count
        }


# Singleton instance
refill_predictor = RefillPredictor()
