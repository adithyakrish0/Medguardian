import os
from app import create_app, db
from app.models import User, Medication, MedicationLog, CaregiverSenior, HealthIncident, ChatHistory

app = create_app()
with app.app_context():
    print('Users:', User.query.count())
    print('Medications:', Medication.query.count())
    print('MedicationLogs:', MedicationLog.query.count())
    print('CaregiverLinks:', CaregiverSenior.query.count())
    print('HealthIncidents:', HealthIncident.query.count())
    print('ChatHistories:', ChatHistory.query.count())
