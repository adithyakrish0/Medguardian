# app/models/medication_log.py
from app.extensions import db
from datetime import datetime

class MedicationLog(db.Model):
    __tablename__ = 'medication_log'
    
    id = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # When taken
    taken_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    scheduled_time = db.Column(db.DateTime, nullable=True)  # When medication was scheduled
    
    # Verification info
    taken_correctly = db.Column(db.Boolean, default=True)
    verified_by_camera = db.Column(db.Boolean, default=False)  # Was camera verification used?
    verification_confidence = db.Column(db.Float, nullable=True)  # Auto-detection confidence 0-1
    verification_method = db.Column(db.String(50), nullable=True)  # 'auto', 'manual', 'manual_fallback'
    
    # Additional notes
    notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    medication = db.relationship('Medication', backref='logs')
    user = db.relationship('User', backref='medication_logs')
    
    def __repr__(self):
        return f'<MedicationLog {self.id}: Med={self.medication_id} at {self.taken_at}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'medication_id': self.medication_id,
            'user_id': self.user_id,
            'taken_at': self.taken_at.isoformat() if self.taken_at else None,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'taken_correctly': self.taken_correctly,
            'verified_by_camera': self.verified_by_camera,
            'verification_confidence': self.verification_confidence,
            'verification_method': self.verification_method,
            'notes': self.notes
        }