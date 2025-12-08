"""
Health Incident Model
Tracks auto-detected falls, emergencies, and health incidents
"""

from app.extensions import db
from datetime import datetime


class HealthIncident(db.Model):
    """Record of health incidents (falls, emergencies, etc.)"""
    
    __tablename__ = 'health_incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Incident details
    incident_type = db.Column(db.String(50), nullable=False)  # fall, emergency, distress, etc.
    detected_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    
    # Detection info
    auto_detected = db.Column(db.Boolean, default=False)  # Auto vs manual report
    confidence = db.Column(db.Float)  # Detection confidence 0-1
    detection_method = db.Column(db.String(50))  # camera, sensor, manual, etc.
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, false_alarm, resolved
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # Response
    caregiver_notified = db.Column(db.Boolean, default=False)
    caregiver_response = db.Column(db.Text)
    response_time_seconds = db.Column(db.Integer)  # Time to caregiver response
    
    # Additional data
    notes = db.Column(db.Text)
    metadata = db.Column(db.Text)  # JSON for additional info
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('health_incidents', lazy='dynamic'))
    
    def __repr__(self):
        return f'<HealthIncident {self.id}: {self.incident_type} at {self.detected_at}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'incident_type': self.incident_type,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'auto_detected': self.auto_detected,
            'confidence': self.confidence,
            'detection_method': self.detection_method,
            'status': self.status,
            'severity': self.severity,
            'caregiver_notified': self.caregiver_notified,
            'notes': self.notes
        }
