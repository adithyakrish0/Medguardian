from app import create_app
from app.models.medication import Medication
from app.extensions import db
from datetime import date, datetime, timedelta
import json

app = create_app()

with app.app_context():
    now = datetime.now()
    test_time = now + timedelta(minutes=3)
    time_str = test_time.strftime('%H:%M')
    
    med = Medication(
        name=f'FINAL TEST {time_str}',
        dosage='999mg',
        frequency='Custom',
        instructions='FINAL REDIRECT TEST',
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
    
    print("="*60)
    print(f"✅ Created: {med.name} (ID: {med.id})")
    print(f"📅 Scheduled for: {time_str}")
    print(f"⏰ Current time: {now.strftime('%H:%M:%S')}")
    print(f"⏳ Will fire in ~3 minutes")
    print("="*60)
    print("\n🔥 REFRESH DASHBOARD AND WATCH!")
    print("   At", time_str, "you should see:")
    print("   1. Console: '🔔 Medication reminder received'")
    print("   2. PAGE REDIRECTS to reminder page")
    print("="*60)
