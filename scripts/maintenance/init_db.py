# init_db.py
from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.emergency_contact import EmergencyContact
from app.models.relationship import CaregiverSenior

app = create_app()

with app.app_context():
    db.create_all()
    print("Database tables created successfully!")
