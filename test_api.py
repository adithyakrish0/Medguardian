
import os
from app import create_app
from app.extensions import db
from app.models.medication import Medication
from datetime import date

app = create_app()
with app.app_context():
    try:
        today = date.today()
        # Test basic query
        count = Medication.query.count()
        print(f"Total medications: {count}")
        
        # Test filtered query
        meds = Medication.query.filter(
            (Medication.start_date.is_(None)) | (Medication.start_date <= today)
        ).all()
        print(f"Filtered medications: {len(meds)}")
        print("Test SUCCESSFUL")
    except Exception as e:
        import traceback
        print(f"Test FAILED: {e}")
        traceback.print_exc()
