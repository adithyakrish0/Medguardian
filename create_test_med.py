"""Create a test medication for redirect testing"""
from app import create_app
from app.models.medication import Medication
from app.extensions import db
from datetime import date, datetime, timedelta
import json

app = create_app()

with app.app_context():
    now = datetime.now()
    test_time = now + timedelta(minutes=2)
    time_str = test_time.strftime('%H:%M')
    
    med = Medication(
        name=f'REDIRECT TEST {time_str}',
        dosage='1 tablet',
        frequency='Custom',
        instructions='TEST - Should redirect to reminder page',
        user_id=1,
        morning=False,
        afternoon=False,
        evening=False,
        night=False,
        custom_reminder_times=json.dumps([time_str]),
        start_date=date.today(),
        priority='critical'
    )
    
    db.session.add(med)
    db.session.commit()
    
    print(f'Created: {med.name} (ID: {med.id})')
    print(f'Scheduled for: {time_str}')
    current_time = now.strftime("%H:%M:%S")
    print(f'Current time: {current_time}')
    print(f'Will fire in ~2 minutes')
