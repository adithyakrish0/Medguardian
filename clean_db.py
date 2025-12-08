from app import create_app
from app.extensions import db
from app.models.medication import Medication, MedicationLog

app = create_app()

with app.app_context():
    num_logs = MedicationLog.query.delete()
    num_meds = Medication.query.delete()
    db.session.commit()
    print(f"🧹 Database cleaned: Deleted {num_meds} medications and {num_logs} logs.")
