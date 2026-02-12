# app/models/refill_alert.py
"""RefillAlert model for tracking medication refill notifications."""

from app.extensions import db
from datetime import datetime


class RefillAlert(db.Model):
    """Tracks refill alerts for medications running low on supply."""
    
    __tablename__ = 'refill_alert'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False, index=True)
    
    # Alert severity
    alert_level = db.Column(db.String(20), nullable=False, index=True)  # critical, warning, info
    
    # Prediction data
    days_remaining = db.Column(db.Integer, nullable=False)
    predicted_depletion_date = db.Column(db.Date, nullable=False)
    forecast_method = db.Column(db.String(20), default='linear')  # linear, prophet
    
    # Confidence interval (days)
    confidence_low = db.Column(db.Date, nullable=True)  # Earliest possible depletion
    confidence_high = db.Column(db.Date, nullable=True)  # Latest possible depletion
    
    # Consumption stats at time of alert
    avg_daily_consumption = db.Column(db.Float, nullable=True)
    consumption_variance = db.Column(db.Float, nullable=True)
    
    # Status tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    acknowledged = db.Column(db.Boolean, default=False, index=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Auto-resolved when refill detected
    auto_resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    patient = db.relationship('User', foreign_keys=[patient_id], backref='refill_alerts')
    medication = db.relationship('Medication', backref='refill_alerts')
    acknowledger = db.relationship('User', foreign_keys=[acknowledged_by])
    
    def __repr__(self):
        return f'<RefillAlert {self.id}: {self.alert_level} for Med {self.medication_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'medication_id': self.medication_id,
            'medication_name': self.medication.name if self.medication else None,
            'alert_level': self.alert_level,
            'days_remaining': self.days_remaining,
            'predicted_depletion_date': self.predicted_depletion_date.isoformat() if self.predicted_depletion_date else None,
            'confidence_low': self.confidence_low.isoformat() if self.confidence_low else None,
            'confidence_high': self.confidence_high.isoformat() if self.confidence_high else None,
            'avg_daily_consumption': round(self.avg_daily_consumption, 2) if self.avg_daily_consumption else None,
            'forecast_method': self.forecast_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'auto_resolved': self.auto_resolved
        }
    
    @classmethod
    def get_active_for_patient(cls, patient_id: int):
        """Get all active (unacknowledged, unresolved) alerts for a patient."""
        return cls.query.filter(
            cls.patient_id == patient_id,
            cls.acknowledged == False,
            cls.auto_resolved == False
        ).order_by(cls.days_remaining.asc()).all()
    
    @classmethod
    def get_recent_for_medication(cls, medication_id: int, hours: int = 24):
        """Check if an alert was recently created for a medication."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        return cls.query.filter(
            cls.medication_id == medication_id,
            cls.created_at >= cutoff
        ).first()
