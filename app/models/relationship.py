from app.extensions import db

class CaregiverSenior(db.Model):
    """Many-to-many relationship between caregivers and seniors"""
    __tablename__ = 'caregiver_senior'
    
    id = db.Column(db.Integer, primary_key=True)
    caregiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    senior_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    relationship_type = db.Column(db.String(50), default='primary')  # primary, secondary, etc.
    added_at = db.Column(db.DateTime, server_default=db.func.now())
    notes = db.Column(db.Text)
    
    # Relationships
    caregiver = db.relationship("User", foreign_keys=[caregiver_id], backref=db.backref("caregiver_relationships", cascade="all, delete-orphan"))
    senior = db.relationship("User", foreign_keys=[senior_id], backref=db.backref("senior_relationships", cascade="all, delete-orphan"))
    
    def __repr__(self):
        return f'<CaregiverSenior {self.caregiver.username} -> {self.senior.username}>'
