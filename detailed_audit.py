from app import create_app, db
from sqlalchemy import inspect
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    
    models = {
        'user': User,
        'medication': Medication,
        'medication_log': MedicationLog,
        'caregiver_senior': CaregiverSenior
    }
    
    for table_name, model in models.items():
        db_cols = set(col['name'] for col in inspector.get_columns(table_name))
        model_cols = set(c.key for c in model.__table__.columns)
        
        missing_in_db = model_cols - db_cols
        if missing_in_db:
            print(f"Table '{table_name}' MISSING columns in DB: {missing_in_db}")
        else:
            print(f"Table '{table_name}' is UP TO DATE.")
