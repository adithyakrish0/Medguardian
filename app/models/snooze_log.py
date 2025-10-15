from app.extensions import db
from datetime import datetime

class SnoozeLog(db.Model):
    __tablename__ = 'snooze_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=True)
    original_medication_time = db.Column(db.DateTime, nullable=False)
    snooze_until = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    snooze_duration_minutes = db.Column(db.Integer, default=5)
    
    # Relationships
    user = db.relationship('User', backref='snooze_logs')
    medication = db.relationship('Medication', backref='snooze_logs')
    
    def to_dict(self):
        """Convert snooze log to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'medication_id': self.medication_id,
            'medication_name': self.medication.name if self.medication else None,
            'original_medication_time': self.original_medication_time.isoformat(),
            'snooze_until': self.snooze_until.isoformat(),
            'created_at': self.created_at.isoformat(),
            'snooze_duration_minutes': self.snooze_duration_minutes
        }
    
    def __repr__(self):
        return f'<SnoozeLog {self.user_id} snoozed until {self.snooze_until}>'
