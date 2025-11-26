"""
Database model enhancements with indexes for performance
"""
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.snooze_log import SnoozeLog
from app.models.medication_interaction import MedicationInteraction
from app.models.relationship import CaregiverSenior

# This migration adds indexes to frequently queried columns

def add_indexes():
    """Add database indexes for better query performance"""
    
    # Medication indexes
    db.Index('idx_medication_user_id', Medication.user_id)
    
    # MedicationLog indexes
    db.Index('idx_medlog_user_id', MedicationLog.user_id)
    db.Index('idx_medlog_medication_id', MedicationLog.medication_id)
    db.Index('idx_medlog_taken_at', MedicationLog.taken_at)
    db.Index('idx_medlog_user_taken', MedicationLog.user_id, MedicationLog.taken_at)
    
    # SnoozeLog indexes
    db.Index('idx_snooze_user_id', SnoozeLog.user_id)
    db.Index('idx_snooze_until', SnoozeLog.snooze_until)
    db.Index('idx_snooze_user_until', SnoozeLog.user_id, SnoozeLog.snooze_until)
    
    # Interaction indexes
    db.Index('idx_interaction_med1', MedicationInteraction.medication1_id)
    db.Index('idx_interaction_med2', MedicationInteraction.medication2_id)
    
    # Relationship indexes
    db.Index('idx_relationship_caregiver', CaregiverSenior.caregiver_id)
    db.Index('idx_relationship_senior', CaregiverSenior.senior_id)
    
    print("Database indexes added successfully!")
    print("Run 'flask db migrate -m \"Add performance indexes\"' to generate migration")
    print("Then 'flask db upgrade' to apply")

if __name__ == '__main__':
    from app import create_app
    app = create_app()
    with app.app_context():
        add_indexes()
