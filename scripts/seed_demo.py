#!/usr/bin/env python3
"""
seed_demo.py — One-command Idempotent Demo Environment Seeder
=============================================================

Creates a complete, demo-ready MedGuardian environment:

  • demo_senior  (password: demo123) — a senior with 5 medications
  • demo_caregiver (password: demo123) — a linked caregiver
  • 30 days of realistic medication-log history (~85 % adherence)
  • 2 emergency contacts for the senior
  • 2 drug-interaction entries between the seeded medications

Idempotent: running twice will NOT create duplicates.
Every entity is looked up first; only missing items are inserted.

Usage
-----
    python scripts/seed_demo.py          # seed everything
    python scripts/seed_demo.py --reset  # wipe demo data, then re-seed
"""

import sys, os, json, random, argparse
from datetime import datetime, timedelta, date

# ---------------------------------------------------------------------------
# Bootstrap — make sure the project root is on sys.path
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.models.emergency_contact import EmergencyContact
from app.models.medication_interaction import MedicationInteraction

# ---------------------------------------------------------------------------
# Configuration — everything in one place for easy tweaking
# ---------------------------------------------------------------------------
SENIOR_USERNAME   = "demo_senior"
SENIOR_EMAIL      = "senior@medguardian-demo.com"
SENIOR_FULLNAME   = "John Sharma"
SENIOR_PHONE      = "+91 98765 43210"

CAREGIVER_USERNAME  = "demo_caregiver"
CAREGIVER_EMAIL     = "caregiver@medguardian-demo.com"
CAREGIVER_FULLNAME  = "Dr. Priya Patel"
CAREGIVER_PHONE     = "+91 99887 76655"

PASSWORD = "demo123"

MEDICATIONS = [
    {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "instructions": "Take with meals to reduce stomach upset. Do not crush or chew.",
        "priority": "high",
        "morning": True,
        "evening": True,
        "custom_reminder_times": json.dumps(["08:00", "20:00"]),
        "quantity_remaining": 42,
        "initial_quantity": 60,
    },
    {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "instructions": "Take in the morning for blood-pressure control. Avoid potassium supplements.",
        "priority": "high",
        "morning": True,
        "custom_reminder_times": json.dumps(["09:00"]),
        "quantity_remaining": 25,
        "initial_quantity": 30,
    },
    {
        "name": "Atorvastatin",
        "dosage": "20mg",
        "frequency": "Once daily",
        "instructions": "Take at bedtime for optimal cholesterol reduction.",
        "priority": "high",
        "night": True,
        "custom_reminder_times": json.dumps(["21:30"]),
        "quantity_remaining": 18,
        "initial_quantity": 30,
    },
    {
        "name": "Vitamin D3",
        "dosage": "1000 IU",
        "frequency": "Once daily",
        "instructions": "Take with breakfast for best absorption.",
        "priority": "low",
        "afternoon": True,
        "custom_reminder_times": json.dumps(["12:00"]),
        "quantity_remaining": 55,
        "initial_quantity": 90,
    },
    {
        "name": "Aspirin",
        "dosage": "81mg",
        "frequency": "Once daily",
        "instructions": "Low-dose aspirin for heart health. Take with food.",
        "priority": "normal",
        "morning": True,
        "custom_reminder_times": json.dumps(["08:00"]),
        "quantity_remaining": 60,
        "initial_quantity": 90,
    },
]

EMERGENCY_CONTACTS = [
    {
        "name": "Anita Sharma",
        "relationship": "Daughter",
        "phone": "+91 98765 11111",
        "email": "anita.sharma@example.com",
        "priority": 1,
        "notify_for_missed_dose": True,
        "notify_for_emergency": True,
    },
    {
        "name": "Rajesh Kumar",
        "relationship": "Neighbour",
        "phone": "+91 98765 22222",
        "email": "rajesh.k@example.com",
        "priority": 2,
        "notify_for_missed_dose": False,
        "notify_for_emergency": True,
    },
]

# Drug interaction entries (will be linked to seeded medications by name)
DRUG_INTERACTIONS = [
    {
        "med1_name": "Metformin",
        "med2_name": "Lisinopril",
        "severity": "moderate",
        "description": (
            "Lisinopril may enhance the hypoglycaemic effect of Metformin. "
            "Blood-sugar levels should be monitored more frequently when "
            "these medications are taken together."
        ),
        "recommendation": (
            "Monitor blood glucose closely, especially when starting or "
            "adjusting doses. No dosage change usually required."
        ),
        "source": "drugs.com",
        "risk_factors": json.dumps([
            "elderly patient",
            "renal impairment",
            "concomitant diuretics"
        ]),
    },
    {
        "med1_name": "Aspirin",
        "med2_name": "Lisinopril",
        "severity": "moderate",
        "description": (
            "Aspirin may reduce the antihypertensive effect of Lisinopril. "
            "NSAIDs and salicylates can antagonise ACE inhibitors."
        ),
        "recommendation": (
            "Use the lowest effective aspirin dose (≤100 mg). Monitor blood "
            "pressure regularly. Consult physician if BP rises."
        ),
        "source": "rxlist",
        "risk_factors": json.dumps([
            "high-dose aspirin",
            "chronic kidney disease",
            "heart failure"
        ]),
    },
]

# Adherence-log generation parameters
LOG_DAYS           = 30
TARGET_ADHERENCE   = 0.85
WEEKEND_PENALTY    = 0.15   # adherence drops by this much on weekends
HIGH_PRIORITY_BUMP = 0.05   # high-priority meds get a boost
CAMERA_VERIFY_RATE = 0.40   # 40 % of taken doses verified by camera

# Fix random seed so repeated runs produce the same logs (truly idempotent)
random.seed(42)


# ── helpers ─────────────────────────────────────────────────────────────────

def get_or_create_user(username, email, full_name, role, phone=None):
    """Return existing user or create a new one. Never duplicates."""
    user = User.query.filter_by(username=username).first()
    if user:
        print(f"   ↩  User '{username}' already exists (ID {user.id})")
        return user, False

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        phone=phone,
        email_verified=True,
    )
    user.set_password(PASSWORD)
    db.session.add(user)
    db.session.flush()
    print(f"   ✚  Created user '{username}' (ID {user.id})")
    return user, True


def get_or_create_medication(user_id, med_data):
    """Return existing medication or create. Keyed on (user_id, name)."""
    med = Medication.query.filter_by(user_id=user_id, name=med_data["name"]).first()
    if med:
        print(f"   ↩  Medication '{med.name}' already exists (ID {med.id})")
        return med, False

    med = Medication(
        user_id=user_id,
        start_date=date.today() - timedelta(days=60),
        reminder_enabled=True,
        **med_data,
    )
    db.session.add(med)
    db.session.flush()
    print(f"   ✚  Added medication: {med.name} ({med.dosage})")
    return med, True


def ensure_relationship(caregiver_id, senior_id):
    """Create the caregiver ↔ senior link if it doesn't exist."""
    rel = CaregiverSenior.query.filter_by(
        caregiver_id=caregiver_id, senior_id=senior_id
    ).first()
    if rel:
        print(f"   ↩  Relationship already exists (ID {rel.id})")
        return rel, False

    rel = CaregiverSenior(
        caregiver_id=caregiver_id,
        senior_id=senior_id,
        status="accepted",
        relationship_type="healthcare_provider",
    )
    db.session.add(rel)
    db.session.flush()
    print(f"   ✚  Linked caregiver → senior")
    return rel, True


def ensure_emergency_contact(user_id, contact_data):
    """Create emergency contact if not already present (keyed on name + user)."""
    ec = EmergencyContact.query.filter_by(
        user_id=user_id, name=contact_data["name"]
    ).first()
    if ec:
        print(f"   ↩  Emergency contact '{ec.name}' already exists")
        return ec, False

    ec = EmergencyContact(user_id=user_id, **contact_data)
    db.session.add(ec)
    db.session.flush()
    print(f"   ✚  Added emergency contact: {ec.name} ({ec.relationship})")
    return ec, True


def ensure_drug_interaction(med1_id, med2_id, interaction_data):
    """Create drug interaction entry if not already present."""
    existing = MedicationInteraction.query.filter_by(
        medication1_id=med1_id, medication2_id=med2_id
    ).first()
    if not existing:
        # Also check the reverse pairing
        existing = MedicationInteraction.query.filter_by(
            medication1_id=med2_id, medication2_id=med1_id
        ).first()
    if existing:
        print(f"   ↩  Interaction already exists (ID {existing.id})")
        return existing, False

    ix = MedicationInteraction(
        medication1_id=med1_id,
        medication2_id=med2_id,
        severity=interaction_data["severity"],
        description=interaction_data["description"],
        recommendation=interaction_data["recommendation"],
        source=interaction_data["source"],
        risk_factors=interaction_data["risk_factors"],
    )
    db.session.add(ix)
    db.session.flush()
    print(f"   ✚  Added interaction: {ix.severity}")
    return ix, True


def generate_medication_logs(senior_id, medications):
    """
    Generate 30 days of realistic medication-log history.

    Idempotent: if logs already exist for a (medication, date, time) combo
    no new logs are created.
    """
    existing_count = MedicationLog.query.filter_by(user_id=senior_id).count()
    if existing_count > 0:
        print(f"   ↩  {existing_count} medication logs already exist — skipping generation")
        return existing_count

    print(f"   📊 Generating {LOG_DAYS} days of adherence data …")
    today = date.today()
    logs_created = 0
    taken_count = 0
    total_dose_slots = 0

    for days_ago in range(LOG_DAYS, -1, -1):
        log_date = today - timedelta(days=days_ago)
        is_weekend = log_date.weekday() >= 5
        base_rate = TARGET_ADHERENCE - (WEEKEND_PENALTY if is_weekend else 0)

        for med in medications:
            times = json.loads(med.custom_reminder_times or "[]")
            if not times:
                times = ["08:00"]

            for time_str in times:
                total_dose_slots += 1
                try:
                    h, m = map(int, time_str.split(":"))
                except ValueError:
                    h, m = 8, 0

                # Adjust rate per priority
                rate = base_rate
                if med.priority == "high":
                    rate += HIGH_PRIORITY_BUMP
                elif med.priority == "low":
                    rate -= 0.05

                took = random.random() < rate

                if took:
                    taken_count += 1
                    variance = random.randint(-20, 45)
                    taken_dt = datetime.combine(
                        log_date, datetime.min.time().replace(hour=h, minute=m)
                    ) + timedelta(minutes=variance)

                    log = MedicationLog(
                        medication_id=med.id,
                        user_id=senior_id,
                        taken_at=taken_dt,
                        scheduled_time=datetime.combine(
                            log_date, datetime.min.time().replace(hour=h, minute=m)
                        ),
                        taken_correctly=True,
                        status="verified",
                        verified_by_camera=random.random() < CAMERA_VERIFY_RATE,
                        verification_confidence=round(random.uniform(0.75, 0.99), 2)
                            if random.random() < CAMERA_VERIFY_RATE else None,
                        verification_method="auto" if random.random() < 0.6 else "manual",
                        notes=random.choice([None, None, None, "Felt fine", "Slight nausea"]),
                    )
                    db.session.add(log)
                    logs_created += 1
                else:
                    # 60 % of missed doses get an explicit skip log
                    if random.random() < 0.6:
                        scheduled_dt = datetime.combine(
                            log_date, datetime.min.time().replace(hour=h, minute=m)
                        )
                        log = MedicationLog(
                            medication_id=med.id,
                            user_id=senior_id,
                            taken_at=scheduled_dt,
                            scheduled_time=scheduled_dt,
                            taken_correctly=False,
                            status="skipped",
                            notes=random.choice(["Forgot", "Felt unwell", "Ran out of pills"]),
                        )
                        db.session.add(log)
                        logs_created += 1

    db.session.flush()
    actual_rate = round(taken_count / max(total_dose_slots, 1) * 100, 1)
    print(f"   ✅ Created {logs_created} logs ({actual_rate}% adherence over {LOG_DAYS} days)")
    return logs_created


# ── reset helper ────────────────────────────────────────────────────────────

def reset_demo_data():
    """Nuclear option: delete everything owned by demo users."""
    print("\n🧹 Resetting demo data …")
    for username in [SENIOR_USERNAME, CAREGIVER_USERNAME]:
        user = User.query.filter_by(username=username).first()
        if not user:
            continue
        # Order matters — children before parents
        MedicationLog.query.filter_by(user_id=user.id).delete()
        EmergencyContact.query.filter_by(user_id=user.id).delete()
        # Drug interactions reference medications, so delete them first
        for med in Medication.query.filter_by(user_id=user.id).all():
            MedicationInteraction.query.filter(
                (MedicationInteraction.medication1_id == med.id) |
                (MedicationInteraction.medication2_id == med.id)
            ).delete(synchronize_session="fetch")
        Medication.query.filter_by(user_id=user.id).delete()
        CaregiverSenior.query.filter(
            (CaregiverSenior.senior_id == user.id) |
            (CaregiverSenior.caregiver_id == user.id)
        ).delete(synchronize_session="fetch")
        db.session.delete(user)
    db.session.commit()
    print("   ✅ All demo data removed\n")


# ── main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed MedGuardian demo environment")
    parser.add_argument("--reset", action="store_true", help="Wipe demo data before seeding")
    args = parser.parse_args()

    print()
    print("=" * 60)
    print("🏥  MedGuardian — Demo Environment Seeder")
    print("=" * 60)

    app = create_app()

    with app.app_context():
        try:
            if args.reset:
                reset_demo_data()

            # ── 1. Users ─────────────────────────────────────────────
            print("\n👤 Users")
            senior, _   = get_or_create_user(
                SENIOR_USERNAME, SENIOR_EMAIL, SENIOR_FULLNAME, "senior", SENIOR_PHONE
            )
            caregiver, _ = get_or_create_user(
                CAREGIVER_USERNAME, CAREGIVER_EMAIL, CAREGIVER_FULLNAME, "caregiver", CAREGIVER_PHONE
            )

            # ── 2. Relationship ───────────────────────────────────────
            print("\n🔗 Caregiver ↔ Senior Link")
            ensure_relationship(caregiver.id, senior.id)

            # ── 3. Medications ────────────────────────────────────────
            print("\n💊 Medications")
            med_objects = []
            for md in MEDICATIONS:
                med, _ = get_or_create_medication(senior.id, md)
                med_objects.append(med)

            # ── 4. Medication Logs (30 days, ~85 % adherence) ─────────
            print("\n📊 Medication Logs")
            generate_medication_logs(senior.id, med_objects)

            # ── 5. Emergency Contacts ─────────────────────────────────
            print("\n🆘 Emergency Contacts")
            for ec_data in EMERGENCY_CONTACTS:
                ensure_emergency_contact(senior.id, ec_data)

            # ── 6. Drug Interactions ──────────────────────────────────
            print("\n⚠️  Drug Interactions")
            # Build name → id map for linking
            med_by_name = {m.name: m.id for m in med_objects}
            for ix_data in DRUG_INTERACTIONS:
                m1_id = med_by_name.get(ix_data["med1_name"])
                m2_id = med_by_name.get(ix_data["med2_name"])
                if m1_id and m2_id:
                    ensure_drug_interaction(m1_id, m2_id, ix_data)
                else:
                    missing = [n for n in [ix_data["med1_name"], ix_data["med2_name"]]
                               if n not in med_by_name]
                    print(f"   ⚠  Skipped interaction — medication(s) not found: {missing}")

            # ── Commit ────────────────────────────────────────────────
            db.session.commit()

            # ── Summary ───────────────────────────────────────────────
            print("\n" + "=" * 60)
            print("✅  Demo environment ready!")
            print("=" * 60)
            print()
            print("  👴 Senior Login")
            print(f"     Username : {SENIOR_USERNAME}")
            print(f"     Password : {PASSWORD}")
            print(f"     Name     : {SENIOR_FULLNAME}")
            print()
            print("  👩‍⚕️ Caregiver Login")
            print(f"     Username : {CAREGIVER_USERNAME}")
            print(f"     Password : {PASSWORD}")
            print(f"     Name     : {CAREGIVER_FULLNAME}")
            print()
            print(f"  💊 {len(med_objects)} medications")
            print(f"  📊 {LOG_DAYS} days of adherence history (~{int(TARGET_ADHERENCE*100)}%)")
            print(f"  🆘 {len(EMERGENCY_CONTACTS)} emergency contacts")
            print(f"  ⚠️  {len(DRUG_INTERACTIONS)} drug interaction entries")
            print()
            print("  🚀  Ready for demo!")
            print()

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
