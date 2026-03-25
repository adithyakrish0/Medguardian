import os
import sys
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog

def seed_adherence():
    app = create_app()
    with app.app_context():
        # Get all seniors
        seniors = User.query.filter_by(role='senior').all()
        print(f"Found {len(seniors)} seniors.")
        
        now = datetime.utcnow()
        
        for senior in seniors:
            # Get medications for this senior
            meds = Medication.query.filter_by(user_id=senior.id).all()
            if not meds:
                print(f"No medications for {senior.username}. Skipping.")
                continue
                
            # Add 3 'verified' logs for today to boost adherence
            for i in range(3):
                med = meds[i % len(meds)]
                # Space them out in the past
                taken_at = now - timedelta(hours=i+1)
                
                log = MedicationLog(
                    user_id=senior.id,
                    medication_id=med.id,
                    taken_at=taken_at,
                    status='verified',
                    taken_correctly=True,
                    verification_method='auto',
                    verification_confidence=0.98,
                    notes=f"Diagnostic seed log {i+1}"
                )
                db.session.add(log)
            
            print(f"Added 3 verified logs for {senior.username}")
        
        db.session.commit()
        print("Database commit successful.")

if __name__ == "__main__":
    seed_adherence()
