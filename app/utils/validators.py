"""Input validation utilities using Pydantic"""
from datetime import date, time
from typing import Optional, List
from pydantic import BaseModel, Field, validator, EmailStr
import json


class MedicationCreateSchema(BaseModel):
    """Schema for creating a new medication"""
    name: str = Field(..., min_length=1, max_length=100)
    dosage: str = Field(..., min_length=1, max_length=50)
    frequency: str = Field(default='daily', max_length=50)
    instructions: Optional[str] = Field(None, max_length=500)
    
    # Time slots
    morning: bool = False
    afternoon: bool = False
    evening: bool = False
    night: bool = False
    
    # Reminder settings
    reminder_enabled: bool = True
    reminder_sound: bool = True
    reminder_voice: bool = True
    custom_reminder_times: Optional[str] = None
    
    # Date range
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    priority: str = Field(default='normal', pattern='^(low|normal|high|critical)$')
    
    # Verification
    barcode: Optional[str] = Field(None, max_length=100)
    image: Optional[str] = None  # Base64 encoded reference image
    
    @validator('image')
    def validate_reference_image(cls, v):
        if not v:
            return v
        if not v.startswith('data:image/'):
            raise ValueError('Invalid image format - must be data URI')
        max_size = 16 * 1024 * 1024
        if len(v) > max_size * 1.33:
            raise ValueError(f'Image too large (max {max_size} bytes)')
        return v
    
    @validator('name')
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()
    
    @validator('dosage')
    def dosage_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Dosage cannot be empty')
        return v.strip()
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v < values['start_date']:
                raise ValueError('End date must be after start date')
        return v
    
    @validator('custom_reminder_times')
    def validate_custom_times(cls, v):
        if v:
            try:
                times = json.loads(v) if isinstance(v, str) else v
                if not isinstance(times, list):
                    raise ValueError('Custom times must be a list')
                # Validate time format
                for t in times:
                    time.fromisoformat(t)
            except (json.JSONDecodeError, ValueError) as e:
                raise ValueError(f'Invalid custom reminder times: {e}')
        return v
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat() if v else None
        }


class MedicationUpdateSchema(BaseModel):
    """Schema for updating medication"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    dosage: Optional[str] = Field(None, min_length=1, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = Field(None, max_length=500)
    
    morning: Optional[bool] = None
    afternoon: Optional[bool] = None
    evening: Optional[bool] = None
    night: Optional[bool] = None
    
    reminder_enabled: Optional[bool] = None
    reminder_sound: Optional[bool] = None
    reminder_voice: Optional[bool] = None
    custom_reminder_times: Optional[str] = None
    
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    priority: Optional[str] = Field(None, pattern='^(low|normal|high|critical)$')
    
    barcode: Optional[str] = Field(None, max_length=100)


class UserRegistrationSchema(BaseModel):
    """Schema for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(default='senior', pattern='^(senior|caregiver|admin)$')
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (with - and _ allowed)')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v


class VerificationRequestSchema(BaseModel):
    """Schema for medication verification request"""
    medication_id: int = Field(..., gt=0)
    image: str  # Base64 encoded image
    verification_method: str = Field(default='camera', pattern='^(camera|upload|barcode)$')
    
    @validator('image')
    def validate_image(cls, v):
        # Basic validation - check if it looks like base64
        if not v.startswith('data:image/'):
            raise ValueError('Invalid image format - must be data URI')
        
        # Check size (rough estimate: base64 is ~33% larger than binary)
        max_size = 16 * 1024 * 1024  # 16MB
        if len(v) > max_size * 1.33:
            raise ValueError(f'Image too large (max {max_size} bytes)')
        
        return v
