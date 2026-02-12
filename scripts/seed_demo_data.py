#!/usr/bin/env python3
"""
Seed Demo Data Script for MedGuardian
======================================
Creates demo users and realistic medication data for B.Tech demo presentation.

Usage:
    python scripts/seed_demo_data.py

This will create:
    - demo_senior: A senior user with medications and 30 days of adherence logs
    - demo_caregiver: A caregiver linked to the demo senior

Password for both: demo123
"""

import sys
import os
import random
from datetime import datetime, timedelta, date

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior


def clear_demo_data():
    """Remove existing demo users and their data"""
    print("🧹 Clearing existing demo data...")
    
    demo_usernames = ['demo_senior', 'demo_caregiver']
    
    for username in demo_usernames:
        user = User.query.filter_by(username=username).first()
        if user:
            # Delete medication logs first
            MedicationLog.query.filter_by(user_id=user.id).delete()
            # Delete medications
            Medication.query.filter_by(user_id=user.id).delete()
            # Delete relationships
            CaregiverSenior.query.filter(
                (CaregiverSenior.senior_id == user.id) | 
                (CaregiverSenior.caregiver_id == user.id)
            ).delete()
            # Delete user
            db.session.delete(user)
    
    db.session.commit()
    print("✅ Demo data cleared")


def create_demo_senior():
    """Create the demo senior user with medications"""
    print("👴 Creating demo senior user...")
    
    senior = User(
        username='demo_senior',
        email='senior@medguardian-demo.com',
        full_name='John Sharma',
        role='senior',
        email_verified=True
    )
    senior.set_password('demo123')
    db.session.add(senior)
    db.session.flush()  # Get the ID
    
    print(f"   Created user: {senior.username} (ID: {senior.id})")
    
    # Create realistic medications
    medications = [
        {
            'name': 'Metformin',
            'dosage': '500mg',
            'frequency': 'Twice daily',
            'instructions': 'Take with meals to reduce stomach upset',
            'priority': 'high',
            'morning': True,
            'evening': True,
            'custom_reminder_times': '["08:00", "20:00"]'
        },
        {
            'name': 'Lisinopril',
            'dosage': '10mg',
            'frequency': 'Once daily',
            'instructions': 'Take in the morning for blood pressure control',
            'priority': 'high',
            'morning': True,
            'custom_reminder_times': '["09:00"]'
        },
        {
            'name': 'Vitamin D3',
            'dosage': '1000 IU',
            'frequency': 'Once daily',
            'instructions': 'Take with breakfast for best absorption',
            'priority': 'low',
            'afternoon': True,
            'custom_reminder_times': '["12:00"]'
        },
        {
            'name': 'Aspirin',
            'dosage': '81mg',
            'frequency': 'Once daily',
            'instructions': 'Low-dose aspirin for heart health',
            'priority': 'normal',
            'morning': True,
            'custom_reminder_times': '["08:00"]'
        }
    ]
    
    med_objects = []
    for med_data in medications:
        med = Medication(
            user_id=senior.id,
            start_date=date.today() - timedelta(days=60),  # Started 2 months ago
            **med_data
        )
        db.session.add(med)
        med_objects.append(med)
        print(f"   Added medication: {med.name} ({med.dosage})")
    
    db.session.flush()
    return senior, med_objects


def create_medication_logs(senior, medications):
    """Create 30 days of realistic medication logs"""
    print("📊 Generating 30 days of adherence data...")
    
    today = date.today()
    logs_created = 0
    
    for days_ago in range(30, -1, -1):  # 30 days ago to today
        log_date = today - timedelta(days=days_ago)
        
        # Weekend adherence is slightly lower (realistic)
        is_weekend = log_date.weekday() >= 5
        base_adherence = 0.75 if is_weekend else 0.90
        
        for med in medications:
            # Parse reminder times
            import json
            try:
                times = json.loads(med.custom_reminder_times or '[]')
            except:
                times = ['08:00']
            
            for time_str in times:
                try:
                    h, m = map(int, time_str.split(':'))
                except:
                    h, m = 8, 0
                
                # Determine if dose was taken (with realistic adherence rate)
                adherence_modifier = 1.0 if med.priority == 'high' else 0.95
                took_medication = random.random() < (base_adherence * adherence_modifier)
                
                if took_medication:
                    # Add some time variance (-30 to +60 minutes)
                    variance_minutes = random.randint(-30, 60)
                    taken_dt = datetime.combine(log_date, datetime.min.time().replace(hour=h, minute=m))
                    taken_dt += timedelta(minutes=variance_minutes)
                    
                    # Occasionally verify by camera (40% of the time)
                    verified_by_camera = random.random() < 0.4
                    
                    log = MedicationLog(
                        medication_id=med.id,
                        user_id=senior.id,
                        taken_at=taken_dt,
                        taken_correctly=True,
                        verified_by_camera=verified_by_camera,
                        notes='Demo data' if random.random() < 0.1 else None
                    )
                    db.session.add(log)
                    logs_created += 1
                else:
                    # Log a missed dose (50% of the time we explicitly log it)
                    if random.random() < 0.5:
                        scheduled_dt = datetime.combine(log_date, datetime.min.time().replace(hour=h, minute=m))
                        log = MedicationLog(
                            medication_id=med.id,
                            user_id=senior.id,
                            taken_at=scheduled_dt,
                            taken_correctly=False,
                            status='skipped',  # Correct field
                            notes='Forgot' if random.random() < 0.7 else 'Felt unwell'
                        )
                        db.session.add(log)
                        logs_created += 1
    
    db.session.flush()
    print(f"   Created {logs_created} medication logs")
    return logs_created


def create_demo_caregiver(senior):
    """Create the demo caregiver and link to senior"""
    print("👩‍⚕️ Creating demo caregiver user...")
    
    caregiver = User(
        username='demo_caregiver',
        email='caregiver@medguardian-demo.com',
        full_name='Dr. Priya Patel',
        role='caregiver',
        email_verified=True
    )
    caregiver.set_password('demo123')
    db.session.add(caregiver)
    db.session.flush()
    
    print(f"   Created user: {caregiver.username} (ID: {caregiver.id})")
    
    # Create relationship
    relationship = CaregiverSenior(
        caregiver_id=caregiver.id,
        senior_id=senior.id,
        status='accepted',
        relationship_type='healthcare_provider'
    )
    db.session.add(relationship)
    db.session.flush()
    
    print(f"   Linked caregiver to senior: {caregiver.username} → {senior.username}")
    return caregiver


def main():
    """Main function to seed demo data"""
    print("\n" + "="*60)
    print("🏥 MedGuardian Demo Data Seeder")
    print("="*60 + "\n")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Clear existing demo data
            clear_demo_data()
            
            # Create demo senior with medications
            senior, medications = create_demo_senior()
            
            # Create medication logs
            create_medication_logs(senior, medications)
            
            # Create demo caregiver
            caregiver = create_demo_caregiver(senior)
            
            # Commit all changes
            db.session.commit()
            
            print("\n" + "="*60)
            print("✅ Demo data seeded successfully!")
            print("="*60)
            print("\n📋 Demo Accounts Created:")
            print("-" * 40)
            print(f"  👴 Senior Login:")
            print(f"     Username: demo_senior")
            print(f"     Password: demo123")
            print(f"     Name: {senior.full_name}")
            print()
            print(f"  👩‍⚕️ Caregiver Login:")
            print(f"     Username: demo_caregiver")
            print(f"     Password: demo123")
            print(f"     Name: {caregiver.full_name}")
            print("-" * 40)
            print(f"\n📊 Data Created:")
            print(f"   • {len(medications)} medications")
            print(f"   • 30 days of adherence history")
            print(f"   • ~85% overall adherence rate (realistic)")
            print("\n🚀 Ready for demo!")
            print()
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error seeding data: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    main()
