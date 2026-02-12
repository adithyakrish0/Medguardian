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
    taken_correctly = db.Column(db.Boolean, default=True)  # Legacy field, kept for compatibility
    verified_by_camera = db.Column(db.Boolean, default=False)  # Was camera verification used?
    verification_confidence = db.Column(db.Float, nullable=True)  # Auto-detection confidence 0-1
    verification_method = db.Column(db.String(50), nullable=True)  # 'auto', 'manual', 'manual_fallback'
    
    # NEW: Proper status field - 'verified', 'skipped', 'missed'
    status = db.Column(db.String(20), nullable=True, default='verified', index=True)
    
    # Additional notes
    notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    medication = db.relationship('Medication', backref=db.backref('logs', cascade="all, delete-orphan"))
    user = db.relationship('User', backref='medication_logs')
    
    def __repr__(self):
        return f'<MedicationLog {self.id}: Med={self.medication_id} status={self.status} at {self.taken_at}>'
    
    def get_status(self):
        """Get the status, falling back to taken_correctly for legacy logs"""
        if self.status:
            return self.status
        # Legacy fallback
        return 'verified' if self.taken_correctly else 'skipped'
    
    def to_dict(self):
        return {
            'id': self.id,
            'medication_id': self.medication_id,
            'user_id': self.user_id,
            'taken_at': self.taken_at.isoformat() if self.taken_at else None,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'taken_correctly': self.taken_correctly,
            'status': self.get_status(),
            'verified_by_camera': self.verified_by_camera,
            'verification_confidence': self.verification_confidence,
            'verification_method': self.verification_method,
            'notes': self.notes
        }