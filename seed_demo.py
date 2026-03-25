"""
MedGuardian Demo Seeder
=======================
Creates 1 caregiver + 3 seniors with 30 days of realistic medication data.

Usage:  python seed_demo.py
"""

import random
import json
from datetime import datetime, date, timedelta

# Deterministic randomness for reproducible data
random.seed(42)

# ── Account Definitions ──────────────────────────────────────────────
PASSWORD = 'Demo@2026'

ACCOUNTS = [
    {'username': 'grandma_mary',  'email': 'mary@demo.mg',   'role': 'senior',    'full_name': 'Mary Thomas'},
    {'username': 'grandpa_raj',   'email': 'raj@demo.mg',    'role': 'senior',    'full_name': 'Raj Sharma'},
    {'username': 'aunt_priya',    'email': 'priya@demo.mg',  'role': 'senior',    'full_name': 'Priya Nair'},
    {'username': 'democaregiver', 'email': 'cg@demo.mg',     'role': 'caregiver', 'full_name': 'Dr. Arun Kumar'},
]

# ── Medication Definitions ────────────────────────────────────────────
MEDICATIONS = {
    'grandma_mary': [
        {'name': 'Metformin',     'dosage': '500mg',   'frequency': 'Twice daily',  'priority': 'high',   'morning': True, 'evening': True,  'custom_reminder_times': '["08:00","18:00"]', 'initial_quantity': 60,  'quantity_remaining': 28, 'instructions': 'Take with food'},
        {'name': 'Atorvastatin',  'dosage': '10mg',    'frequency': 'Once daily',   'priority': 'normal', 'night': True,   'custom_reminder_times': '["21:00"]',             'initial_quantity': 30,  'quantity_remaining': 14, 'instructions': 'Take at bedtime'},
        {'name': 'Amlodipine',    'dosage': '5mg',     'frequency': 'Once daily',   'priority': 'normal', 'morning': True, 'custom_reminder_times': '["08:00"]',             'initial_quantity': 30,  'quantity_remaining': 15, 'instructions': 'Take in the morning'},
    ],
    'grandpa_raj': [
        {'name': 'Losartan',      'dosage': '50mg',    'frequency': 'Once daily',   'priority': 'high',   'morning': True, 'custom_reminder_times': '["09:00"]',             'initial_quantity': 30,  'quantity_remaining': 5,  'instructions': 'Take on empty stomach'},
        {'name': 'Omeprazole',    'dosage': '20mg',    'frequency': 'Once daily',   'priority': 'normal', 'morning': True, 'custom_reminder_times': '["07:30"]',             'initial_quantity': 30,  'quantity_remaining': 18, 'instructions': 'Take 30 min before breakfast'},
        {'name': 'Paracetamol',   'dosage': '500mg',   'frequency': 'Three times',  'priority': 'normal', 'morning': True, 'afternoon': True, 'night': True, 'custom_reminder_times': '["08:00","14:00","21:00"]', 'initial_quantity': 90, 'quantity_remaining': 38, 'instructions': 'Take as needed for pain'},
        {'name': 'Insulin Glargine', 'dosage': '10 units', 'frequency': 'Once daily', 'priority': 'high', 'night': True, 'custom_reminder_times': '["22:00"]', 'initial_quantity': 30, 'quantity_remaining': 11, 'instructions': 'Inject subcutaneously at bedtime'},
    ],
    'aunt_priya': [
        {'name': 'Warfarin',       'dosage': '5mg',     'frequency': 'Once daily',   'priority': 'high',   'evening': True,  'custom_reminder_times': '["18:00"]',             'initial_quantity': 30,  'quantity_remaining': 14, 'instructions': 'Take at same time daily. Avoid vitamin K foods'},
        {'name': 'Aspirin',        'dosage': '75mg',    'frequency': 'Once daily',   'priority': 'high',   'morning': True,  'custom_reminder_times': '["08:00"]',             'initial_quantity': 30,  'quantity_remaining': 15, 'instructions': 'Take with food'},
        {'name': 'Lisinopril',     'dosage': '10mg',    'frequency': 'Once daily',   'priority': 'normal', 'morning': True,  'custom_reminder_times': '["08:00"]',             'initial_quantity': 30,  'quantity_remaining': 17, 'instructions': 'Monitor blood pressure'},
        {'name': 'Calcium + Vit D', 'dosage': '500mg',  'frequency': 'Once daily',   'priority': 'normal', 'afternoon': True, 'custom_reminder_times': '["13:00"]',            'initial_quantity': 60,  'quantity_remaining': 30, 'instructions': 'Take with lunch'},
        {'name': 'Metformin',      'dosage': '850mg',   'frequency': 'Twice daily',  'priority': 'high',   'morning': True, 'evening': True,  'custom_reminder_times': '["08:00","19:00"]', 'initial_quantity': 60, 'quantity_remaining': 24, 'instructions': 'Take with meals'},
    ],
}

# Adherence profiles: (take_rate, miss_rate, late_rate, skip_rate)
ADHERENCE = {
    'grandma_mary': (0.85, 0.05, 0.05, 0.05),   # 85% taken, 5% each miss/late/skip
    'grandpa_raj':  (0.55, 0.25, 0.10, 0.10),    # 55% taken, 25% missed — the problem patient
    'aunt_priya':   (0.75, 0.10, 0.10, 0.05),    # 75% taken
}

# Drug interaction for aunt_priya
INTERACTION = {
    'med1': 'Warfarin',
    'med2': 'Aspirin',
    'severity': 'critical',
    'description': 'Aspirin increases the anticoagulant effect of Warfarin, significantly raising bleeding risk. This combination requires close INR monitoring and dose adjustment.',
    'recommendation': 'Monitor INR weekly. Consider dose reduction of Warfarin. Watch for signs of bleeding (bruising, blood in urine/stool). Consult hematologist.',
    'source': 'drugs.com',
    'risk_factors': json.dumps(['Age > 65', 'Concurrent NSAID use', 'History of GI bleeding']),
}

EMERGENCY_CONTACTS = {
    'grandma_mary': {'name': 'Dr. Arun Kumar',   'relationship': 'Primary Caregiver', 'phone': '+91-9876543210', 'email': 'cg@demo.mg'},
    'grandpa_raj':  {'name': 'Dr. Arun Kumar',   'relationship': 'Primary Caregiver', 'phone': '+91-9876543210', 'email': 'cg@demo.mg'},
    'aunt_priya':   {'name': 'Dr. Arun Kumar',   'relationship': 'Primary Caregiver', 'phone': '+91-9876543210', 'email': 'cg@demo.mg'},
}


def get_dose_times(med_def):
    """Parse custom_reminder_times to actual time strings."""
    try:
        return json.loads(med_def.get('custom_reminder_times', '[]'))
    except:
        return []


def generate_logs(user_id, medication_id, dose_times, adherence_profile, days=30):
    """Generate realistic medication logs for the past N days."""
    take_r, miss_r, late_r, skip_r = adherence_profile
    logs = []
    today = date.today()

    for day_offset in range(days, 0, -1):
        log_date = today - timedelta(days=day_offset)

        for time_str in dose_times:
            hour, minute = map(int, time_str.split(':'))
            scheduled = datetime(log_date.year, log_date.month, log_date.day, hour, minute)

            roll = random.random()

            if roll < take_r:
                # TAKEN — on time or slightly varied (±15 min)
                variance = random.randint(-10, 15)
                taken_at = scheduled + timedelta(minutes=variance)
                method = random.choice(['manual', 'manual', 'manual', 'ai_camera'])
                confidence = round(random.uniform(0.72, 0.96), 2) if method == 'ai_camera' else None
                logs.append({
                    'medication_id': medication_id,
                    'user_id': user_id,
                    'taken_at': taken_at,
                    'scheduled_time': scheduled,
                    'taken_correctly': True,
                    'status': 'verified',
                    'verification_method': method,
                    'verification_confidence': confidence,
                    'verified_by_camera': method == 'ai_camera',
                    'notes': 'Taken on time' if variance <= 5 else f'Taken {variance}min late',
                })

            elif roll < take_r + late_r:
                # LATE — taken 30-90 min after scheduled
                delay = random.randint(30, 90)
                taken_at = scheduled + timedelta(minutes=delay)
                logs.append({
                    'medication_id': medication_id,
                    'user_id': user_id,
                    'taken_at': taken_at,
                    'scheduled_time': scheduled,
                    'taken_correctly': True,
                    'status': 'verified',
                    'verification_method': 'manual',
                    'verification_confidence': None,
                    'verified_by_camera': False,
                    'notes': f'Taken {delay}min late',
                })

            elif roll < take_r + late_r + skip_r:
                # SKIPPED — user explicitly skipped
                logs.append({
                    'medication_id': medication_id,
                    'user_id': user_id,
                    'taken_at': scheduled + timedelta(minutes=random.randint(5, 30)),
                    'scheduled_time': scheduled,
                    'taken_correctly': False,
                    'status': 'skipped',
                    'verification_method': None,
                    'verification_confidence': None,
                    'verified_by_camera': False,
                    'notes': random.choice(['Felt nauseous', 'Skipped deliberately', 'Ran out of pills']),
                })

            else:
                # MISSED — no log created (dose was simply missed)
                # We create a missed log for analytics
                logs.append({
                    'medication_id': medication_id,
                    'user_id': user_id,
                    'taken_at': scheduled + timedelta(hours=2),
                    'scheduled_time': scheduled,
                    'taken_correctly': False,
                    'status': 'missed',
                    'verification_method': None,
                    'verification_confidence': None,
                    'verified_by_camera': False,
                    'notes': 'Missed dose',
                })

    return logs


def generate_snooze_logs(user_id, medication_id, dose_times, count=2):
    """Generate a few snooze log entries."""
    logs = []
    today = date.today()

    for i in range(count):
        day_offset = random.randint(2, 25)
        log_date = today - timedelta(days=day_offset)
        time_str = random.choice(dose_times)
        hour, minute = map(int, time_str.split(':'))

        original = datetime(log_date.year, log_date.month, log_date.day, hour, minute)
        snooze_mins = random.choice([5, 10, 15])

        logs.append({
            'user_id': user_id,
            'medication_id': medication_id,
            'original_medication_time': original,
            'snooze_until': original + timedelta(minutes=snooze_mins),
            'created_at': original,
            'snooze_duration_minutes': snooze_mins,
        })

    return logs


def run():
    import os
    # Disable scheduler/telegram so seed script doesn't conflict with running server
    os.environ['SCHEDULER_ENABLED'] = 'False'
    os.environ['TELEGRAM_BOT_TOKEN'] = ''

    from app import create_app
    app = create_app()

    with app.app_context():
        from app.extensions import db
        from app.models.auth import User
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        from app.models.relationship import CaregiverSenior
        from app.models.medication_interaction import MedicationInteraction, InteractionCheckResult
        from app.models.emergency_contact import EmergencyContact
        from app.models.snooze_log import SnoozeLog

        print("=" * 60)
        print("  MedGuardian Demo Seeder")
        print("=" * 60)

        # ── Step 1: Create Accounts ─────────────────────────────────
        print("\n[1/6] Creating accounts...")
        users = {}
        for acct in ACCOUNTS:
            existing = User.query.filter_by(username=acct['username']).first()
            if existing:
                print(f"  ✓ {acct['username']} already exists (id={existing.id})")
                users[acct['username']] = existing
            else:
                u = User(
                    username=acct['username'],
                    email=acct['email'],
                    role=acct['role'],
                    full_name=acct['full_name'],
                    email_verified=True,
                )
                u.set_password(PASSWORD)
                db.session.add(u)
                db.session.flush()  # Get ID
                print(f"  + Created {acct['username']} (id={u.id}, role={acct['role']})")
                users[acct['username']] = u

        db.session.commit()

        # ── Step 2: Link Caregiver to Seniors ────────────────────────
        print("\n[2/6] Linking caregiver to seniors...")
        caregiver = users['democaregiver']
        for senior_name in ['grandma_mary', 'grandpa_raj', 'aunt_priya']:
            senior = users[senior_name]
            existing_rel = CaregiverSenior.query.filter_by(
                caregiver_id=caregiver.id,
                senior_id=senior.id
            ).first()
            if existing_rel:
                print(f"  ✓ {caregiver.username} → {senior.username} already linked")
            else:
                rel = CaregiverSenior(
                    caregiver_id=caregiver.id,
                    senior_id=senior.id,
                    relationship_type='primary',
                    status='accepted',
                )
                db.session.add(rel)
                print(f"  + Linked {caregiver.username} → {senior.username}")

        db.session.commit()

        # ── Step 3: Create Medications ───────────────────────────────
        print("\n[3/6] Creating medications...")
        med_objects = {}  # {senior_username: {med_name: Medication}}

        for senior_name, meds in MEDICATIONS.items():
            senior = users[senior_name]
            med_objects[senior_name] = {}

            for med_def in meds:
                existing_med = Medication.query.filter_by(
                    user_id=senior.id,
                    name=med_def['name']
                ).first()

                if existing_med:
                    print(f"  ✓ {senior_name}: {med_def['name']} already exists (id={existing_med.id})")
                    med_objects[senior_name][med_def['name']] = existing_med
                else:
                    med = Medication(
                        user_id=senior.id,
                        name=med_def['name'],
                        dosage=med_def['dosage'],
                        frequency=med_def['frequency'],
                        priority=med_def.get('priority', 'normal'),
                        morning=med_def.get('morning', False),
                        afternoon=med_def.get('afternoon', False),
                        evening=med_def.get('evening', False),
                        night=med_def.get('night', False),
                        custom_reminder_times=med_def.get('custom_reminder_times'),
                        instructions=med_def.get('instructions', ''),
                        initial_quantity=med_def.get('initial_quantity'),
                        quantity_remaining=med_def.get('quantity_remaining'),
                        refill_threshold_days=3,
                        start_date=date.today() - timedelta(days=35),
                        reminder_enabled=True,
                        ai_trained=False,
                    )
                    db.session.add(med)
                    db.session.flush()
                    print(f"  + {senior_name}: {med.name} (id={med.id}, qty={med.quantity_remaining})")
                    med_objects[senior_name][med_def['name']] = med

        db.session.commit()

        # ── Step 4: Generate 30 Days of Logs ─────────────────────────
        print("\n[4/6] Generating 30 days of medication logs...")
        total_logs = 0

        for senior_name, meds in MEDICATIONS.items():
            senior = users[senior_name]
            profile = ADHERENCE[senior_name]

            # Check if logs already exist for this user in last 30 days
            cutoff = datetime.now() - timedelta(days=31)
            existing_count = MedicationLog.query.filter(
                MedicationLog.user_id == senior.id,
                MedicationLog.taken_at >= cutoff
            ).count()

            if existing_count > 20:
                print(f"  ✓ {senior_name}: Already has {existing_count} logs, skipping")
                continue

            for med_def in meds:
                med = med_objects[senior_name][med_def['name']]
                dose_times = get_dose_times(med_def)

                if not dose_times:
                    continue

                logs = generate_logs(senior.id, med.id, dose_times, profile, days=30)

                for log_data in logs:
                    log = MedicationLog(**log_data)
                    db.session.add(log)
                    total_logs += 1

                # Generate 1-3 snooze logs per med
                snooze_count = random.randint(1, 3)
                snooze_logs = generate_snooze_logs(senior.id, med.id, dose_times, count=snooze_count)
                for sl_data in snooze_logs:
                    sl = SnoozeLog(**sl_data)
                    db.session.add(sl)

            # Print adherence stats
            taken = sum(1 for l in logs if l.get('status') == 'verified')
            missed = sum(1 for l in logs if l.get('status') == 'missed')
            skipped = sum(1 for l in logs if l.get('status') == 'skipped')
            print(f"  + {senior_name}: Generated logs (pattern: {int(profile[0]*100)}% adherence)")

        db.session.commit()
        print(f"  Total logs created: {total_logs}")

        # ── Step 5: Drug Interactions ────────────────────────────────
        print("\n[5/6] Setting up drug interactions...")
        priya = users['aunt_priya']
        warfarin = med_objects['aunt_priya'].get('Warfarin')
        aspirin = med_objects['aunt_priya'].get('Aspirin')

        if warfarin and aspirin:
            existing = MedicationInteraction.query.filter_by(
                medication1_id=warfarin.id,
                medication2_id=aspirin.id
            ).first()

            if existing:
                print(f"  ✓ Warfarin ↔ Aspirin interaction already exists")
            else:
                interaction = MedicationInteraction(
                    medication1_id=warfarin.id,
                    medication2_id=aspirin.id,
                    severity=INTERACTION['severity'],
                    description=INTERACTION['description'],
                    recommendation=INTERACTION['recommendation'],
                    source=INTERACTION['source'],
                    risk_factors=INTERACTION['risk_factors'],
                )
                db.session.add(interaction)
                print(f"  + Created Warfarin ↔ Aspirin (CRITICAL)")

            # Also create an InteractionCheckResult
            existing_check = InteractionCheckResult.query.filter_by(user_id=priya.id).first()
            if not existing_check:
                check = InteractionCheckResult(
                    user_id=priya.id,
                    medications_checked=json.dumps(['Warfarin', 'Aspirin', 'Lisinopril', 'Calcium + Vit D', 'Metformin']),
                    interactions_found=json.dumps([{
                        'drug1': 'Warfarin',
                        'drug2': 'Aspirin',
                        'severity': 'critical',
                        'description': INTERACTION['description'],
                    }]),
                    overall_risk='critical',
                    summary_recommendation='Critical interaction detected between Warfarin and Aspirin. Monitor INR weekly.',
                )
                db.session.add(check)
                print(f"  + Created InteractionCheckResult for aunt_priya")

        db.session.commit()

        # ── Step 6: Emergency Contacts ───────────────────────────────
        print("\n[6/6] Setting up emergency contacts...")
        for senior_name, contact_data in EMERGENCY_CONTACTS.items():
            senior = users[senior_name]
            existing = EmergencyContact.query.filter_by(user_id=senior.id).first()

            if existing:
                print(f"  ✓ {senior_name}: Emergency contact already exists")
            else:
                ec = EmergencyContact(
                    user_id=senior.id,
                    name=contact_data['name'],
                    relationship=contact_data['relationship'],
                    phone=contact_data['phone'],
                    email=contact_data['email'],
                    priority=1,
                    notify_for_missed_dose=True,
                    notify_for_emergency=True,
                )
                db.session.add(ec)
                print(f"  + {senior_name}: Added {contact_data['name']} as emergency contact")

        db.session.commit()

        # ── Summary ──────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("  DEMO SEED COMPLETE")
        print("=" * 60)
        print(f"\n  Accounts (password: {PASSWORD}):")
        for name, user in users.items():
            print(f"    {user.role:10s} | {name:16s} (id={user.id})")

        print(f"\n  Medications:")
        for senior_name, meds in med_objects.items():
            print(f"    {senior_name}:")
            for med_name, med in meds.items():
                print(f"      - {med_name} ({med.dosage}) [qty: {med.quantity_remaining}]")

        print(f"\n  Data coverage: 30 days of logs, snooze events, interactions")
        print(f"  Total medication logs: ~{total_logs}")
        print(f"\n  Ready to demo! 🚀\n")


if __name__ == '__main__':
    run()
