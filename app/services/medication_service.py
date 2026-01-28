"""Medication service - Business logic for medication management"""
from datetime import datetime, date
from typing import List, Optional, Dict
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog


class MedicationService:
    """Service for medication management"""
    
    @staticmethod
    def get_all_for_user(user_id: int) -> List[Medication]:
        """Get all medications for a user with optimized loading"""
        return Medication.query.filter_by(user_id=user_id).all()
    
    @staticmethod
    def get_active_medications(user_id: int, current_date: Optional[date] = None) -> List[Medication]:
        """Get active medications for a user (within date range)"""
        if current_date is None:
            current_date = date.today()
        
        query = Medication.query.filter_by(user_id=user_id)
        
        # Filter by date range if dates are set
        query = query.filter(
            (Medication.start_date.is_(None)) | (Medication.start_date <= current_date)
        ).filter(
            (Medication.end_date.is_(None)) | (Medication.end_date >= current_date)
        )
        
        return query.all()
    
    @staticmethod
    def get_by_id(medication_id: int, user_id: Optional[int] = None) -> Optional[Medication]:
        """Get medication by ID, optionally verify ownership"""
        query = Medication.query.filter_by(id=medication_id)
        
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        
        return query.first()
    
    @staticmethod
    def create(user_id: int, data: Dict) -> Medication:
        """Create a new medication"""
        medication = Medication(
            user_id=user_id,
            name=data['name'],
            dosage=data['dosage'],
            frequency=data.get('frequency', 'daily'),
            instructions=data.get('instructions'),
            morning=data.get('morning', False),
            afternoon=data.get('afternoon', False),
            evening=data.get('evening', False),
            night=data.get('night', False),
            reminder_enabled=data.get('reminder_enabled', True),
            reminder_sound=data.get('reminder_sound', True),
            reminder_voice=data.get('reminder_voice', True),
            custom_reminder_times=data.get('custom_reminder_times'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            priority=data.get('priority', 'normal'),
            barcode=data.get('barcode'),
        )
        
        db.session.add(medication)
        db.session.commit()
        
        return medication
    
    @staticmethod
    def update(medication_id: int, data: Dict, user_id: Optional[int] = None) -> Optional[Medication]:
        """Update an existing medication"""
        medication = MedicationService.get_by_id(medication_id, user_id)
        
        if not medication:
            return None
        
        # Update fields
        for key, value in data.items():
            if hasattr(medication, key):
                setattr(medication, key, value)
        
        db.session.commit()
        return medication
    
    @staticmethod
    def delete(medication_id: int, user_id: Optional[int] = None) -> bool:
        """Delete a medication"""
        medication = MedicationService.get_by_id(medication_id, user_id)
        
        if not medication:
            return False
        
        db.session.delete(medication)
        db.session.commit()
        return True
    
    @staticmethod
    def mark_taken(medication_id: int, user_id: int, verified: bool = False, 
                   verification_method: Optional[str] = None, notes: Optional[str] = None) -> MedicationLog:
        """Mark medication as taken and create log entry"""
        log = MedicationLog(
            medication_id=medication_id,
            user_id=user_id,
            taken_at=datetime.now(),
            taken_correctly=verified,
            verification_method=verification_method,
            notes=notes or f"Marked as taken{' (verified)' if verified else ''}"
        )
        
        db.session.add(log)
        db.session.commit()
        
        return log
    
    @staticmethod
    def get_medication_logs(medication_id: int, user_id: Optional[int] = None, 
                           limit: int = 50) -> List[MedicationLog]:
        """Get medication logs with optional filtering"""
        query = MedicationLog.query.filter_by(medication_id=medication_id)
        
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        
        return query.order_by(MedicationLog.taken_at.desc()).limit(limit).all()
    
    @staticmethod
    def save_reference_image(medication_id: int, image_path: str, 
                            image_features: Optional[str] = None,
                            label_text: Optional[str] = None) -> bool:
        """Save reference image for visual verification"""
        medication = Medication.query.get(medication_id)
        
        if not medication:
            return False
        
        medication.reference_image_path = image_path
        medication.image_features = image_features
        medication.label_text = label_text
        
        db.session.commit()
        return True
