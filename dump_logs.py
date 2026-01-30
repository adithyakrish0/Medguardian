from app import create_app
from app.models.medication_log import MedicationLog
from app.models.auth import User
from app.models.medication import Medication
from datetime import datetime

app = create_app()
with app.app_context():
    senior = User.query.filter_by(role='senior').first()
    if not senior:
        print("No senior found")
    else:
        print(f"Checking data for Senior: {senior.username} (ID: {senior.id})")
        
        meds = Medication.query.filter_by(user_id=senior.id).all()
        print(f"\nActive Meds: {len(meds)}")
        for m in meds:
            times = m.get_reminder_times()
            print(f"- {m.name} (ID: {m.id})")
            print(f"  Schedule: {times}")
            print(f"  Created: {m.created_at}")
        
        logs = MedicationLog.query.filter_by(user_id=senior.id).all()
        print(f"\nTotal Logs: {len(logs)}")
        for l in logs:
            med_name = l.medication.name if l.medication else "Unknown"
            print(f"- {l.taken_at} | {med_name} | Correct: {l.taken_correctly}")
