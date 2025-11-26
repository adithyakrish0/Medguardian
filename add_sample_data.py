# Script to add sample medication data for testing

from app import create_app
from app.extensions import db
from app.models.medication import Medication
from app.models.auth import User
from datetime import date

app = create_app()

with app.app_context():
    # Find or create test user
    test_user = User.query.filter_by(username='testsenior').first()
    
    if not test_user:
        print("Creating test user...")
        test_user = User(username='testsenior', email='test@medguardian.com', role='senior')
        test_user.set_password('password123')
        db.session.add(test_user)
        db.session.commit()
        print(f"✓ Created test user: testsenior (password: password123)")
    else:
        print(f"✓ Test user exists: testsenior")
    
    # Check if sample medications exist
    existing = Medication.query.filter_by(user_id=test_user.id).count()
    
    if existing > 0:
        print(f"✓ {existing} medications already exist for testsenior")
    else:
        print("Adding sample medications...")
        
        # Sample medications
        medications = [
            {
                'name': 'Aspirin',
                'dosage': '81mg',
                'frequency': 'Once daily',
                'instructions': 'Take with food in the morning',
                'morning': True,
                'priority': 'medium'
            },
            {
                'name': 'Metformin',
                'dosage': '500mg',
                'frequency': 'Twice daily',
                'instructions': 'Take with meals',
                'morning': True,
                'evening': True,
                'priority': 'high'
            },
            {
                'name': 'Lisinopril',
                'dosage': '10mg',
                'frequency': 'Once daily',
                'instructions': 'Take in the morning',
                'morning': True,
                'priority': 'high'
            },
            {
                'name': 'Vitamin D',
                'dosage': '1000 IU',
                'frequency': 'Once daily',
                'instructions': 'Take with breakfast',
                'morning': True,
                'priority': 'low'
            }
        ]
        
        for med_data in medications:
            med = Medication(
                user_id=test_user.id,
                name=med_data['name'],
                dosage=med_data['dosage'],
                frequency=med_data['frequency'],
                instructions=med_data['instructions'],
                morning=med_data.get('morning', False),
                afternoon=med_data.get('afternoon', False),
                evening=med_data.get('evening', False),
                night=med_data.get('night', False),
                priority=med_data.get('priority', 'normal'),
                start_date=date.today(),
                reminder_enabled=True
            )
            db.session.add(med)
        
        db.session.commit()
        print(f"✓ Added {len(medications)} sample medications!")
    
    print("\n" + "="*60)
    print("SAMPLE DATA READY!")
    print("="*60)
    print(f"Login with:")
    print(f"  Username: testsenior")
    print(f"  Password: password123")
    print("="*60)
