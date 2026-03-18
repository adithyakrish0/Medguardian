import os
import sys
import logging
from datetime import datetime

# Disable all logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
os.environ['WERKZEUG_RUN_MAIN'] = 'true' # Suppress some flask logs

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Disable background services
os.environ['SCHEDULER_ENABLED'] = 'False'
os.environ['TELEGRAM_BOT_TOKEN'] = ''

from app import create_app
from app.extensions import db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.medication_interaction import MedicationInteraction
from app.models.snooze_log import SnoozeLog
from app.services.medication_service import MedicationService

app = create_app()

def test_exhaustive_delete():
    print("Starting Exhaustive Delete Test...")
    with app.app_context():
        # Disable SQL auditing for this test to avoid noise
        app.config['SQLALCHEMY_ECHO'] = False
        
        try:
            # 1. Setup User
            user = User.query.filter_by(username='adithya').first()
            if not user:
                user = User.query.first()
            
            if not user:
                print("❌ No users found!")
                return

            print(f"User: {user.username} (ID: {user.id})")

            # 2. Create Test Medication
            med = Medication(user_id=user.id, name='DELETE_TEST_MED', dosage='10mg', frequency='daily')
            db.session.add(med)
            db.session.commit()
            print(f"Medication created (ID: {med.id})")

            # 3. Create Dependent Records
            # Log
            log = MedicationLog(medication_id=med.id, user_id=user.id)
            db.session.add(log)
            
            # Snooze
            snooze = SnoozeLog(
                medication_id=med.id, 
                user_id=user.id, 
                original_medication_time=datetime.now(),
                snooze_until=datetime.now()
            )
            db.session.add(snooze)
            
            # Interaction
            med2 = Medication(user_id=user.id, name='MED2', dosage='5mg', frequency='daily')
            db.session.add(med2)
            db.session.commit()
            
            interaction = MedicationInteraction(
                medication1_id=med.id, 
                medication2_id=med2.id, 
                severity='high',
                description='Test interaction',
                recommendation='Test rec',
                source='manual'
            )
            db.session.add(interaction)
            
            db.session.commit()
            print("Dependent records created.")

            # 4. Attempt Delete
            print("Calling MedicationService.delete...")
            success = MedicationService.delete(med.id, user.id)
            
            if success:
                print("✅ Delete Success!")
                
                # Double check counts
                logs = MedicationLog.query.filter_by(medication_id=med.id).count()
                snoozes = SnoozeLog.query.filter_by(medication_id=med.id).count()
                interactions = MedicationInteraction.query.filter(
                    (MedicationInteraction.medication1_id == med.id) | 
                    (MedicationInteraction.medication2_id == med.id)
                ).count()
                
                if logs == 0 and snoozes == 0 and interactions == 0:
                    print("✅ ALL dependencies cleaned up correctly!")
                else:
                    print(f"❌ Orphans found! Logs={logs}, Snoozes={snoozes}, Interactions={interactions}")
            else:
                print("❌ Delete returned False!")

            # Cleanup
            db.session.delete(med2)
            db.session.commit()

        except Exception as e:
            print(f"❌ TEST CRASHED: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    test_exhaustive_delete()
