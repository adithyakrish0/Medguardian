# app/models/emergency_contact.py
from app.extensions import db
from datetime import datetime

class EmergencyContact(db.Model):
    """Emergency contact for a user"""
    __tablename__ = 'emergency_contacts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Contact details
    name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    
    # Priority (1 = primary contact)
    priority = db.Column(db.Integer, default=1)
    
    # Notification preferences
    notify_for_missed_dose = db.Column(db.Boolean, default=True)
    notify_for_emergency = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('emergency_contacts', lazy='dynamic'))
    
    def __repr__(self):
        return f'<EmergencyContact {self.name} ({self.relationship})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'relationship': self.relationship,
            'phone': self.phone,
            'email': self.email,
            'priority': self.priority,
            'notify_for_missed_dose': self.notify_for_missed_dose,
            'notify_for_emergency': self.notify_for_emergency
        }