# app/models/medication_log.py (新建)
from app.extensions import db
from datetime import datetime

class MedicationLog(db.Model):
    __tablename__ = 'medication_log'
    id = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    taken_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    taken_correctly = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    # 关系
    medication = db.relationship('Medication', backref='logs')