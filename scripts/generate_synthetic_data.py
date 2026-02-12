"""
Synthetic Adherence Data Generator for MedGuardian

Generates 6 months of realistic medication adherence logs for 5 test patients
with varying patterns to demonstrate anomaly detection.

Usage:
    python scripts/generate_synthetic_data.py
    python scripts/generate_synthetic_data.py --dry-run  # Preview without inserting
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import numpy as np
import random
from datetime import datetime, timedelta, date
from typing import List, Dict

# Patient profiles with different adherence patterns
PATIENT_PROFILES = [
    {
        'name': 'TEST_PatientA_Morning',
        'email': 'test_patient_a@medguardian.test',
        'pattern': 'consistent_morning',
        'description': 'Highly consistent morning taker (8-9 AM, 95% adherence)',
        'config': {
            'target_hour': 8.5,  # 8:30 AM mean
            'hour_std': 0.25,   # ±15 min std
            'adherence_rate': 0.95,
            'anomaly_month': None
        }
    },
    {
        'name': 'TEST_PatientB_Evening',
        'email': 'test_patient_b@medguardian.test',
        'pattern': 'consistent_evening',
        'description': 'Consistent evening taker (8-10 PM, 90% adherence)',
        'config': {
            'target_hour': 21.0,  # 9 PM mean
            'hour_std': 0.5,      # ±30 min std
            'adherence_rate': 0.90,
            'anomaly_month': None
        }
    },
    {
        'name': 'TEST_PatientC_Random',
        'email': 'test_patient_c@medguardian.test',
        'pattern': 'inconsistent',
        'description': 'Inconsistent taker (random times, 70% adherence)',
        'config': {
            'target_hour': None,  # Random times
            'hour_std': 4.0,      # Wide variance
            'adherence_rate': 0.70,
            'anomaly_month': None
        }
    },
    {
        'name': 'TEST_PatientD_WeekendSkipper',
        'email': 'test_patient_d@medguardian.test',
        'pattern': 'weekend_skipper',
        'description': 'Weekday consistent, skips weekends',
        'config': {
            'target_hour': 9.0,
            'hour_std': 0.5,
            'adherence_rate': 0.95,  # Weekday rate
            'weekend_rate': 0.3,     # Weekend rate
            'anomaly_month': None
        }
    },
    {
        'name': 'TEST_PatientE_Anomaly',
        'email': 'test_patient_e@medguardian.test',
        'pattern': 'sudden_anomaly',
        'description': 'Normal for 5 months, then 3 AM doses in month 6 (ANOMALY PATIENT)',
        'config': {
            'target_hour': 9.0,
            'hour_std': 0.5,
            'adherence_rate': 0.95,
            'anomaly_month': 6,
            'anomaly_hour': 3.0,  # 3 AM instead of 9 AM
            'anomaly_adherence_drop': 0.65  # Drops to 65%
        }
    }
]


def generate_dose_time(config: Dict, current_date: date, month_number: int) -> datetime:
    """Generate a realistic dose timestamp based on patient config."""
    
    # Check for anomaly period
    if config.get('anomaly_month') and month_number >= config['anomaly_month']:
        target_hour = config.get('anomaly_hour', config['target_hour'])
        hour_std = 1.0  # More erratic timing
    else:
        target_hour = config.get('target_hour')
        hour_std = config.get('hour_std', 0.5)
    
    # Random time for inconsistent patients
    if target_hour is None:
        hour = random.uniform(7, 22)  # Between 7 AM and 10 PM
    else:
        hour = np.random.normal(target_hour, hour_std)
        hour = max(0, min(23.99, hour))  # Clamp to valid range
    
    # Convert hour to time
    hours = int(hour)
    minutes = int((hour - hours) * 60)
    
    return datetime.combine(current_date, datetime.min.time().replace(hour=hours, minute=minutes))


def should_take_dose(config: Dict, current_date: date, month_number: int) -> bool:
    """Determine if patient takes their dose on this day."""
    
    # Check for anomaly-induced adherence drop
    if config.get('anomaly_month') and month_number >= config['anomaly_month']:
        base_rate = config.get('anomaly_adherence_drop', config['adherence_rate'])
    else:
        base_rate = config.get('adherence_rate', 0.9)
    
    # Weekend skipper pattern
    if config.get('weekend_rate') is not None:
        if current_date.weekday() >= 5:  # Saturday=5, Sunday=6
            return random.random() < config['weekend_rate']
    
    return random.random() < base_rate


def generate_patient_logs(profile: Dict, start_date: date, end_date: date) -> List[Dict]:
    """Generate all medication logs for a patient over the date range."""
    
    logs = []
    config = profile['config']
    current = start_date
    month_count = 1
    current_month = start_date.month
    
    while current <= end_date:
        # Track month transitions
        if current.month != current_month:
            current_month = current.month
            month_count += 1
        
        # Determine if dose taken
        taken = should_take_dose(config, current, month_count)
        
        if taken:
            taken_at = generate_dose_time(config, current, month_count)
            
            # Scheduled time (assume 9 AM default)
            scheduled_hour = config.get('target_hour', 9.0) if config.get('target_hour') else 9.0
            scheduled_time = datetime.combine(
                current, 
                datetime.min.time().replace(hour=int(scheduled_hour), minute=0)
            )
            
            logs.append({
                'taken_at': taken_at,
                'scheduled_time': scheduled_time,
                'status': 'verified',
                'taken_correctly': True,
                'verification_method': 'synthetic'
            })
        else:
            # Missed dose - record scheduled time only
            scheduled_hour = config.get('target_hour', 9.0) if config.get('target_hour') else 9.0
            scheduled_time = datetime.combine(
                current,
                datetime.min.time().replace(hour=int(scheduled_hour), minute=0)
            )
            
            logs.append({
                'taken_at': scheduled_time,  # Use scheduled time as placeholder
                'scheduled_time': scheduled_time,
                'status': 'missed',
                'taken_correctly': False,
                'verification_method': 'synthetic'
            })
        
        current += timedelta(days=1)
    
    return logs


def generate_all_synthetic_data(dry_run: bool = False):
    """Generate synthetic data for all test patients and insert into database."""
    
    # Date range: 6 months of data ending yesterday
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=180)  # ~6 months
    
    print(f"\n{'='*60}")
    print("MedGuardian Synthetic Adherence Data Generator")
    print(f"{'='*60}")
    print(f"Date range: {start_date} to {end_date}")
    print(f"Mode: {'DRY RUN (no database changes)' if dry_run else 'PRODUCTION INSERT'}")
    print(f"{'='*60}\n")
    
    if not dry_run:
        from app import create_app
        from app.extensions import db
        from app.models.user import User
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        
        app = create_app()
        ctx = app.app_context()
        ctx.push()
    
    summary = []
    
    for profile in PATIENT_PROFILES:
        print(f"\n📊 Generating: {profile['name']}")
        print(f"   Pattern: {profile['description']}")
        
        logs = generate_patient_logs(profile, start_date, end_date)
        
        taken_count = sum(1 for l in logs if l['status'] == 'verified')
        missed_count = sum(1 for l in logs if l['status'] == 'missed')
        adherence = taken_count / len(logs) * 100 if logs else 0
        
        print(f"   Generated: {len(logs)} days")
        print(f"   Taken: {taken_count} | Missed: {missed_count}")
        print(f"   Adherence: {adherence:.1f}%")
        
        if not dry_run:
            # Create or get test user
            user = User.query.filter_by(email=profile['email']).first()
            if not user:
                user = User(
                    username=profile['name'],
                    email=profile['email'],
                    role='senior'
                )
                user.set_password('TestPassword123!')
                db.session.add(user)
                db.session.flush()
                print(f"   ✅ Created user ID: {user.id}")
            else:
                print(f"   ℹ️ Using existing user ID: {user.id}")
            
            # Create test medication
            medication = Medication.query.filter_by(
                user_id=user.id, 
                name='TEST_Synthetic_Med'
            ).first()
            
            if not medication:
                medication = Medication(
                    user_id=user.id,
                    name='TEST_Synthetic_Med',
                    dosage='100mg',
                    frequency='daily',
                    instructions='Synthetic test medication',
                    priority='normal',
                    morning=True,
                    start_date=start_date
                )
                db.session.add(medication)
                db.session.flush()
                print(f"   ✅ Created medication ID: {medication.id}")
            else:
                # Clear existing logs for this medication
                MedicationLog.query.filter_by(medication_id=medication.id).delete()
                print(f"   ℹ️ Using existing medication ID: {medication.id}, cleared old logs")
            
            # Insert logs
            for log_data in logs:
                log = MedicationLog(
                    medication_id=medication.id,
                    user_id=user.id,
                    taken_at=log_data['taken_at'],
                    scheduled_time=log_data['scheduled_time'],
                    status=log_data['status'],
                    taken_correctly=log_data['taken_correctly'],
                    verification_method=log_data['verification_method']
                )
                db.session.add(log)
            
            db.session.commit()
            print(f"   ✅ Inserted {len(logs)} medication logs")
        
        summary.append({
            'patient': profile['name'],
            'days': len(logs),
            'adherence': f"{adherence:.1f}%",
            'pattern': profile['pattern']
        })
    
    # Print summary table
    print(f"\n{'='*60}")
    print("GENERATION COMPLETE - Summary")
    print(f"{'='*60}")
    print(f"{'Patient':<30} {'Days':<8} {'Adherence':<12} {'Pattern':<20}")
    print("-" * 60)
    for s in summary:
        print(f"{s['patient']:<30} {s['days']:<8} {s['adherence']:<12} {s['pattern']:<20}")
    
    if not dry_run:
        ctx.pop()
        print(f"\n✅ Data inserted into production database")
        print("   Run 'python scripts/cleanup_test_data.py' to remove test data")
    else:
        print(f"\n⚠️ DRY RUN - No data was inserted")
        print("   Run without --dry-run to insert data")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate synthetic adherence data')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    args = parser.parse_args()
    
    generate_all_synthetic_data(dry_run=args.dry_run)
