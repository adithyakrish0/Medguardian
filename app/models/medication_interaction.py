from app.extensions import db

class MedicationInteraction(db.Model):
    """Model for storing medication interaction data"""
    __tablename__ = 'medication_interaction'
    
    id = db.Column(db.Integer, primary_key=True)
    medication1_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    medication2_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=False)
    
    # Interaction severity levels
    severity = db.Column(db.String(20), nullable=False)  # 'critical', 'major', 'moderate', 'minor'
    
    # Interaction description
    description = db.Column(db.Text, nullable=False)
    
    # Management recommendations
    recommendation = db.Column(db.Text, nullable=False)
    
    # Interaction source
    source = db.Column(db.String(100), nullable=False)  # 'drugs.com', 'rxlist', 'manual'
    
    # Risk factors
    risk_factors = db.Column(db.Text)  # JSON string of risk factors
    
    # Last updated
    last_updated = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # Relationships
    medication1 = db.relationship("Medication", foreign_keys=[medication1_id], backref=db.backref('interactions_as_med1', cascade="all, delete-orphan"))
    medication2 = db.relationship("Medication", foreign_keys=[medication2_id], backref=db.backref('interactions_as_med2', cascade="all, delete-orphan"))
    
    def __repr__(self):
        return f'<MedicationInteraction {self.medication1.name} <-> {self.medication2.name}: {self.severity}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'medication1_name': self.medication1.name,
            'medication2_name': self.medication2.name,
            'severity': self.severity,
            'description': self.description,
            'recommendation': self.recommendation,
            'source': self.source,
            'risk_factors': self.risk_factors,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

class InteractionCheckResult(db.Model):
    """Model for storing interaction check results"""
    __tablename__ = 'interaction_check_result'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    check_date = db.Column(db.DateTime, server_default=db.func.now())
    
    # JSON string of all medications checked
    medications_checked = db.Column(db.Text, nullable=False)  # JSON array of medication names/IDs
    
    # JSON string of interactions found
    interactions_found = db.Column(db.Text)  # JSON array of interaction data
    
    # Overall risk assessment
    overall_risk = db.Column(db.String(20), nullable=False)  # 'low', 'moderate', 'high', 'critical'
    
    # Recommendations summary
    summary_recommendation = db.Column(db.Text)
    
    def __repr__(self):
        return f'<InteractionCheckResult User {self.user_id}: {self.overall_risk}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'check_date': self.check_date.isoformat() if self.check_date else None,
            'medications_checked': json.loads(self.medications_checked) if self.medications_checked else [],
            'interactions_found': json.loads(self.interactions_found) if self.interactions_found else [],
            'overall_risk': self.overall_risk,
            'summary_recommendation': self.summary_recommendation
        }
