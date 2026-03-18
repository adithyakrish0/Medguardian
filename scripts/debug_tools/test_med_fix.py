import os
import sys
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Disable background services
os.environ['SCHEDULER_ENABLED'] = 'False'
os.environ['TELEGRAM_BOT_TOKEN'] = '' # Ensure telegram polling is disabled

from app import create_app
from app.extensions import db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.services.medication_service import MedicationService

# Create app but don't run it
app = create_app()

def test_skip_and_delete():
    with app.app_context():
        # 1. Find or create a test user
        user = User.query.filter_by(username='adithya').first()
        if not user:
            print("User 'adithya' not found, using first user.")
            user = User.query.first()
        
        if not user:
            print("No users found in database!")
            return

        print(f"Testing for user: {user.username} (ID: {user.id})")

        # 2. Create a temporary test medication
        med = Medication(
            user_id=user.id,
            name='DEBUG_TEST_MED',
            dosage='10mg',
            frequency='daily'
        )
        db.session.add(med)
        db.session.commit()
        print(f"Created test medication: {med.name} (ID: {med.id})")

        # 3. Test Skip
        print("Testing Skip...")
        log = MedicationService.skip(med.id, user.id)
        print(f"Skip Log created: ID={log.id}, Status={log.status}, TakenCorrectly={log.taken_correctly}")
        
        if log.status == 'skipped' and log.taken_correctly == False:
            print("✅ Skip Status Fix Verified!")
        else:
            print("❌ Skip Status Fix Failed!")

        # 4. Test Delete (should handle logs)
        print("Testing Delete...")
        success = MedicationService.delete(med.id, user.id)
        
        if success:
            # Verify logs are also gone
            logs_count = MedicationLog.query.filter_by(medication_id=med.id).count()
            if logs_count == 0:
                print("✅ Delete (with logs) Fix Verified!")
            else:
                print(f"❌ Delete Fix Failed: {logs_count} logs remain!")
                # Clean up logs to keep DB clean
                MedicationLog.query.filter_by(medication_id=med.id).delete()
                db.session.commit()
        else:
            print("❌ Delete Fix Failed: Service returned False!")
            # Clean up medication
            db.session.delete(med)
            db.session.commit()

if __name__ == "__main__":
    try:
        test_skip_and_delete()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
