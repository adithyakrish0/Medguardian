"""Base model with common fields for all database models"""
from datetime import datetime
from app.extensions import db


class BaseModel(db.Model):
    """Abstract base model with common fields"""
    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self, include_timestamps=True):
        """Convert model to dictionary for JSON serialization"""
        result = {}
        
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            
            # Skip timestamps if not requested
            if not include_timestamps and column.name in ('created_at', 'updated_at'):
                continue
            
            # Handle datetime serialization
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        
        return result
    
    def update_from_dict(self, data: dict, allowed_fields: list = None):
        """Update model from dictionary"""
        for key, value in data.items():
            # Only update allowed fields
            if allowed_fields and key not in allowed_fields:
                continue
            
            # Only update if column exists
            if hasattr(self, key):
                setattr(self, key, value)
    
    @classmethod
    def create(cls, **kwargs):
        """Create and save a new instance"""
        instance = cls(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance
    
    def save(self):
        """Save the current instance"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete the current instance"""
        db.session.delete(self)
        db.session.commit()
    
    def __repr__(self):
        """Default representation showing ID"""
        return f'<{self.__class__.__name__} {self.id}>'
