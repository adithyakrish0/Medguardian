# app/models/emergency_contact.py
from app.extensions import db

class EmergencyContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    notify_for_missed_dose = db.Column(db.Boolean, default=True)
    notify_for_emergency = db.Column(db.Boolean, default=True)