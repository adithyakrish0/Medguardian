from app.extensions import db
from app.models.base import BaseModel

class Medication(BaseModel):
    __tablename__ = 'medication'
    
    name = db.Column(db.String(100), nullable=False, index=True)
    dosage = db.Column(db.String(50), nullable=False)
    frequency = db.Column(db.String(50), nullable=False)
    instructions = db.Column(db.Text)

    # Relationship to user (senior) - indexed for fast lookups
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False, index=True)

    # Medication times
    morning = db.Column(db.Boolean, default=False)
    afternoon = db.Column(db.Boolean, default=False)
    evening = db.Column(db.Boolean, default=False)
    night = db.Column(db.Boolean, default=False)

    # Reminder settings
    reminder_enabled = db.Column(db.Boolean, default=True)
    reminder_sound = db.Column(db.Boolean, default=True)
    reminder_voice = db.Column(db.Boolean, default=True)

    # Custom reminder times (stored as JSON string, e.g. '["08:00", "14:00"]')
    custom_reminder_times = db.Column(db.String(200))

    # Medication validity period - indexed for filtering active medications
    start_date = db.Column(db.Date, index=True)
    end_date = db.Column(db.Date, index=True)
    priority = db.Column(db.String(20), default='normal', index=True)
    
    # PHASE 1: Barcode verification (for medications that have barcodes)
    barcode = db.Column(db.String(100), nullable=True, index=True)  # UPC/EAN/QR code
    
    # PHASE 3: Visual verification (for medications WITHOUT barcodes - MOST CASES!)
    reference_image_path = db.Column(db.String(500), nullable=True)  # Path to reference photo
    image_features = db.Column(db.Text, nullable=True)  # JSON: color histogram, shape features
    label_text = db.Column(db.Text, nullable=True)  # OCR extracted text from label
    
    # ENHANCED: Multi-angle reference images for AI training (JSON array of base64 images)
    reference_images = db.Column(db.Text, nullable=True)  # JSON: ["base64img1", "base64img2", ...]
    background_image = db.Column(db.Text, nullable=True)  # Background-only capture for subtraction
    ai_trained = db.Column(db.Boolean, default=False)  # True if user completed AI training

    def __repr__(self):
        return f'<Medication {self.name} for User {self.user_id}>'
    
    def to_dict(self, include_timestamps=True):
        """Custom to_dict to include dates properly"""
        result = super().to_dict(include_timestamps)
        
        # Handle date fields
        if self.start_date:
            result['start_date'] = self.start_date.isoformat()
        if self.end_date:
            result['end_date'] = self.end_date.isoformat()
        
        return result
    
    @property
    def is_active(self):
        """Check if medication is currently active based on date range"""
        from datetime import date
        today = date.today()
        
        # Check start date
        if self.start_date and self.start_date > today:
            return False
        
        # Check end date
        if self.end_date and self.end_date < today:
            return False
        
        return True
    
    def get_reminder_times(self):
        """Get all reminder times as list of HH:MM strings"""
        import json
        times = []
        
        # Preset times
        if self.morning:
            times.append('08:00')
        if self.afternoon:
            times.append('14:00')
        if self.evening:
            times.append('18:00')
        if self.night:
            times.append('21:00')
        
        # Custom times from JSON
        if self.custom_reminder_times:
            try:
                custom = json.loads(self.custom_reminder_times)
                if isinstance(custom, list):
                    for t in custom:
                        if t and ':' in str(t):
                            times.append(str(t).strip())
            except (json.JSONDecodeError, TypeError):
                pass
        
        return sorted(set(times))

