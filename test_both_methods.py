"""
Test both medication creation methods
1. Create with standard period  (Morning)
2. Create with custom time
Then verify both save correctly and scheduler can find them
"""
from app import create_app
from app.models.medication import Medication
from app.extensions import db
from datetime import date, datetime, timedelta
import json

app = create_app()

with app.app_context():
    now = datetime.now()
    
    print("="*60)
    print("MEDICATION CREATION TEST")
    print("="*60)
    
    # Test 1: Standard Period (Morning = 8:00 AM)
    print("\n1️⃣ Creating medication with MORNING period...")
    
    med1 = Medication(
        name="TEST MORNING",
        dosage="100mg",
        frequency="Once daily",
        instructions="Morning test",
        user_id=1,
        morning=True,  # This should work
        afternoon=False,
        evening=False,
        night=False,
        custom_reminder_times=None,
        start_date=date.today(),
        priority="high"
    )
    
    db.session.add(med1)
    db.session.commit()
    
    print(f"   ✅ Created: {med1.name} (ID: {med1.id})")
    print(f"   morning={med1.morning}, custom_reminder_times={med1.custom_reminder_times}")
    
    # Test scheduler can find it
    from app.utils.scheduler import get_scheduled_times
    times1 = get_scheduled_times(med1, date.today())
    print(f"   🔍 get_scheduled_times() returned: {times1}")
    if times1:
       for t in times1:
            print(f"      - {t.strftime('%H:%M:%S')}")
    else:
        print("      ❌ EMPTY!")
    
    # Test 2: Custom Time
    print("\n2️⃣ Creating medication with CUSTOM time...")
    
    # Calculate time 2 minutes from now
    test_time = now + timedelta(minutes=2)
    time_str = test_time.strftime('%H:%M')
    
    med2 = Medication(
        name=f"TEST CUSTOM {time_str}",
        dosage="200mg",
        frequency="Custom",
        instructions="Custom time test",
        user_id=1,
        morning=False,
        afternoon=False,
        evening=False,
        night=False,
        custom_reminder_times=json.dumps([time_str]),  # This is what form SHOULD send
        start_date=date.today(),
        priority="critical"
    )
    
    db.session.add(med2)
    db.session.commit()
    
    print(f"   ✅ Created: {med2.name} (ID: {med2.id})")
    print(f"   custom_reminder_times={med2.custom_reminder_times}")
    
    # Test scheduler can find it
    times2 = get_scheduled_times(med2, date.today())
    print(f"   🔍 get_scheduled_times() returned: {times2}")
    if times2:
        for t in times2:
            print(f"      - {t.strftime('%H:%M:%S')}")
    else:
        print("      ❌ EMPTY!")
    
    print("\n" + "="*60)
    print("RESULTS:")
    print("="*60)
    print(f"Morning medication: {'✅ WORKS' if times1 else '❌ BROKEN'}")
    print(f"Custom medication:  {'✅ WORKS' if times2 else '❌ BROKEN'}")
    print()
    print(f"Custom medication will fire at: {time_str}")
    print(f"Current time: {now.strftime('%H:%M:%S')}")
    print(f"Wait ~2 minutes and check if scheduler fires!")
    print("="*60)
