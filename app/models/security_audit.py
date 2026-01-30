from app.extensions import db
from app.models.base import BaseModel
from datetime import datetime

class SecurityAudit(BaseModel):
    __tablename__ = 'security_audit'
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False) # e.g., 'view_senior_dashboard', 'export_report'
    target_id = db.Column(db.Integer, nullable=True) # e.g., senior_id
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    # Relationship to user
    user = db.relationship('User', backref='audit_logs', lazy=True)
