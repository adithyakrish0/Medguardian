import os
import sys
import random
from datetime import datetime, timedelta
import json
import numpy as np

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog

def generate_realistic_data(user_id, months=2):
    """
    Generates 6 months of realistic, slightly "messy" medication adherence data.
    Patterns:
    - 95% compliance on weekdays.
    - 75% compliance on weekends (Weekend Lapse Syndrome).
    - occasional 3-day travel gaps (0% compliance).
    - "Latency Drift": Morning doses are taken later on weekends.
    """
    app = create_app()
    with app.app_context():
        user = User.query.get(user_id)
        if not user:
            print(f"User {user_id} not found.")
            return

        # Clear existing logs for this user to avoid mess
        MedicationLog.query.filter_by(user_id=user_id).delete()
        
        meds = Medication.query.filter_by(user_id=user_id).all()
        if not meds:
            print("No medications found for user. Creating dummy meds...")
            meds = [
                Medication(name="Lisinopril", dosage="10mg", frequency="Daily", morning=True, user_id=user_id),
                Medication(name="Simvastatin", dosage="20mg", frequency="Nightly", night=True, user_id=user_id),
                Medication(name="Metformin", dosage="500mg", frequency="Twice Daily", morning=True, evening=True, user_id=user_id)
            ]
            for m in meds: db.session.add(m)
            db.session.commit()

        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * months)
        
        print(f"Generating data from {start_date.date()} to {end_date.date()}...")
        
        current_date = start_date
        logs_to_add = []
        
        # Periodic travel gaps (randomly every 45 days)
        travel_days = []
        temp_date = start_date
        while temp_date < end_date:
            if random.random() < 0.02: # 2% chance each day starts a 3-day trip
                for i in range(3):
                    travel_days.append((temp_date + timedelta(days=i)).date())
                temp_date += timedelta(days=4)
            else:
                temp_date += timedelta(days=1)

        while current_date <= end_date:
            is_weekend = current_date.weekday() >= 5
            is_traveling = current_date.date() in travel_days
            
            for med in meds:
                times = med.get_reminder_times()
                for t in times:
                    h, m = map(int, t.split(':'))
                    scheduled_time = datetime.combine(current_date.date(), datetime.min.time().replace(hour=h, minute=m))
                    
                    # Decide if dose was taken
                    compliance_prob = 0.98
                    if is_weekend: compliance_prob = 0.75
                    if is_traveling: compliance_prob = 0.05 # Almost never taken while traveling in this sim
                    
                    taken = random.random() < compliance_prob
                    
                    if taken:
                        # Add realistic latency (delay)
                        # Normally 5-15 mins late. Weekends 30-90 mins late.
                        if is_weekend:
                            delay_mins = random.gauss(60, 20)
                        else:
                            delay_mins = random.gauss(10, 5)
                        
                        taken_at = scheduled_time + timedelta(minutes=max(0, delay_mins))
                        
                        log = MedicationLog(
                            user_id=user_id,
                            medication_id=med.id,
                            taken_at=taken_at,
                            scheduled_time=scheduled_time,
                            status='verified',
                            taken_correctly=True,
                            verification_method='auto' if random.random() > 0.2 else 'manual',
                            verification_confidence=random.uniform(0.7, 0.99)
                        )
                    else:
                        # Missed or skipped
                        status = 'missed' if scheduled_time < datetime.now() else 'upcoming'
                        if is_traveling or (is_weekend and random.random() > 0.5):
                             # Logs for missed doses are often not created in real life, 
                             # but for DS we create them with 'missed' status
                             log = MedicationLog(
                                user_id=user_id,
                                medication_id=med.id,
                                taken_at=scheduled_time + timedelta(hours=2), # Marked as missed 2h later
                                scheduled_time=scheduled_time,
                                status='missed',
                                taken_correctly=False,
                                notes="Automatically marked as missed"
                            )
                        else:
                            continue # Don't even log it (simulates total forgetfulness)

                    logs_to_add.append(log)
            
            current_date += timedelta(days=1)
        
        db.session.add_all(logs_to_add)
        db.session.commit()
        print(f"Successfully added {len(logs_to_add)} synthetic records for user {user_id}.")

if __name__ == "__main__":
    # Assuming user ID 1 is the primary test user
    generate_realistic_data(user_id=1)
