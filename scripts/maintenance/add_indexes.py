"""
Database Performance Optimization
Add indexes for frequently queried columns
"""

from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.snooze_log import SnoozeLog
from app.models.relationship import CaregiverSenior
from app.models.auth import User

def add_performance_indexes():
    """
    Add database indexes to improve query performance.
    Run this script after database initialization.
    """
    
    with db.engine.connect() as conn:
        # Medication indexes
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_medication_user_id 
            ON medication(user_id);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_medication_dates 
            ON medication(start_date, end_date);
        """))
        
        # MedicationLog indexes  
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_medication_log_user_date 
            ON medication_log(user_id, taken_at);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_medication_log_medication 
            ON medication_log(medication_id, taken_at);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_medication_log_taken_correctly 
            ON medication_log(taken_correctly, taken_at);
        """))
        
        # SnoozeLog indexes
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_snooze_log_user_until 
            ON snooze_log(user_id, snooze_until);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_snooze_log_medication 
            ON snooze_log(medication_id, snooze_until);
        """))
        
        # CaregiverSenior indexes
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_caregiver_senior_caregiver 
            ON caregiver_senior(caregiver_id);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_caregiver_senior_senior 
            ON caregiver_senior(senior_id);
        """))
        
        # User indexes
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_user_role 
            ON user(role);
        """))
        
        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_user_telegram 
            ON user(telegram_chat_id);
        """))
        
        conn.commit()
        
    print("✅ Performance indexes added successfully!")
    print("Database query performance should be significantly improved.")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    
    with app.app_context():
        add_performance_indexes()
