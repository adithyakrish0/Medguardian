#!/usr/bin/env python3
"""
seed_rich_demo.py — Comprehensive Demo Environment Seeder (90 days)
====================================================================

Creates a fully-populated MedGuardian demo with:
  • rich_senior   (password: demo123) — Margaret Wilson, 72, with 8 medications
  • rich_caregiver (password: demo123) — Dr. Sarah Mitchell, linked caregiver
  • 90 days of realistic medication-log history with adherence waves
  • 4 drug interactions, 3 emergency contacts, 6 health incidents
  • 5 chat history sessions, refill alerts, security audit entries

Idempotent: safe to run multiple times. Uses --reset to wipe first.

Usage:
    $env:PYTHONPATH="."; python scripts/seed_rich_demo.py
    $env:PYTHONPATH="."; python scripts/seed_rich_demo.py --reset
"""

import sys, os, json, random, argparse, uuid
from datetime import datetime, timedelta, date, time

# ---------------------------------------------------------------------------
# Bootstrap
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
from app.models.health_incident import HealthIncident
from app.models.chat_history import ChatHistory
from app.models.refill_alert import RefillAlert
from app.models.security_audit import SecurityAudit

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SENIOR_USERNAME   = "rich_senior"
SENIOR_EMAIL      = "margaret.wilson@medguardian-demo.com"
SENIOR_FULLNAME   = "Margaret Wilson"
SENIOR_PHONE      = "+1-555-0100"

CAREGIVER_USERNAME  = "rich_caregiver"
CAREGIVER_EMAIL     = "dr.mitchell@medguardian-demo.com"
CAREGIVER_FULLNAME  = "Dr. Sarah Mitchell"
CAREGIVER_PHONE     = "+1-555-0200"

PASSWORD = "demo123"
LOG_DAYS = 90

random.seed(2026)

# ---------------------------------------------------------------------------
# Medication definitions
# ---------------------------------------------------------------------------
TODAY = date.today()
NOW = datetime.utcnow()

MEDICATIONS = [
    {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "instructions": "Take with meals. Do not crush or chew.",
        "priority": "high",
        "morning": True,
        "evening": True,
        "custom_reminder_times": json.dumps(["08:00", "20:00"]),
        "start_date": TODAY - timedelta(days=90),
        "quantity_remaining": 45,
        "initial_quantity": 180,
        "last_refill_date": TODAY - timedelta(days=75),
        "refill_threshold_days": 5,
    },
    {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "instructions": "Take in the morning. Avoid potassium supplements.",
        "priority": "high",
        "morning": True,
        "custom_reminder_times": json.dumps(["08:00"]),
        "start_date": TODAY - timedelta(days=90),
        "quantity_remaining": 22,
        "initial_quantity": 90,
        "last_refill_date": TODAY - timedelta(days=70),
        "refill_threshold_days": 5,
    },
    {
        "name": "Atorvastatin",
        "dosage": "20mg",
        "frequency": "Once daily",
        "instructions": "Take at bedtime for optimal cholesterol reduction.",
        "priority": "high",
        "night": True,
        "custom_reminder_times": json.dumps(["21:00"]),
        "start_date": TODAY - timedelta(days=90),
        "quantity_remaining": 28,
        "initial_quantity": 90,
        "last_refill_date": TODAY - timedelta(days=65),
        "refill_threshold_days": 5,
    },
    {
        "name": "Aspirin",
        "dosage": "81mg",
        "frequency": "Once daily",
        "instructions": "Low-dose aspirin for heart health. Take with food.",
        "priority": "normal",
        "morning": True,
        "custom_reminder_times": json.dumps(["08:00"]),
        "start_date": TODAY - timedelta(days=90),
        "quantity_remaining": 35,
        "initial_quantity": 90,
        "last_refill_date": TODAY - timedelta(days=60),
        "refill_threshold_days": 7,
    },
    {
        "name": "Vitamin D3",
        "dosage": "1000IU",
        "frequency": "Once daily",
        "instructions": "Take with breakfast for best absorption.",
        "priority": "low",
        "morning": True,
        "custom_reminder_times": json.dumps(["09:00"]),
        "start_date": TODAY - timedelta(days=75),
        "quantity_remaining": 55,
        "initial_quantity": 90,
        "last_refill_date": TODAY - timedelta(days=50),
        "refill_threshold_days": 7,
    },
    {
        "name": "Omeprazole",
        "dosage": "20mg",
        "frequency": "Once daily",
        "instructions": "Take 30 minutes before breakfast on an empty stomach.",
        "priority": "normal",
        "morning": True,
        "custom_reminder_times": json.dumps(["07:30"]),
        "start_date": TODAY - timedelta(days=60),
        "quantity_remaining": 30,
        "initial_quantity": 60,
        "last_refill_date": TODAY - timedelta(days=30),
        "refill_threshold_days": 5,
    },
    {
        "name": "Amlodipine",
        "dosage": "5mg",
        "frequency": "Once daily",
        "instructions": "Take at the same time daily for consistent blood pressure control.",
        "priority": "high",
        "morning": True,
        "custom_reminder_times": json.dumps(["08:00"]),
        "start_date": TODAY - timedelta(days=45),
        "quantity_remaining": 32,
        "initial_quantity": 45,
        "last_refill_date": TODAY - timedelta(days=15),
        "refill_threshold_days": 5,
    },
    {
        "name": "Calcium Carbonate",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "instructions": "Take with meals. Space 2 hours from other medications.",
        "priority": "low",
        "afternoon": True,
        "evening": True,
        "custom_reminder_times": json.dumps(["12:00", "18:00"]),
        "start_date": TODAY - timedelta(days=30),
        "quantity_remaining": 48,
        "initial_quantity": 60,
        "last_refill_date": TODAY - timedelta(days=5),
        "refill_threshold_days": 7,
    },
]

EMERGENCY_CONTACTS = [
    {
        "name": "Robert Wilson",
        "relationship": "Son",
        "phone": "+1-555-0101",
        "email": "robert.wilson@example.com",
        "priority": 1,
        "notify_for_missed_dose": True,
        "notify_for_emergency": True,
    },
    {
        "name": "Jennifer Wilson",
        "relationship": "Daughter",
        "phone": "+1-555-0102",
        "email": "jennifer.wilson@example.com",
        "priority": 2,
        "notify_for_missed_dose": False,
        "notify_for_emergency": True,
    },
    {
        "name": "Dr. James Chen",
        "relationship": "Primary Physician",
        "phone": "+1-555-0199",
        "email": "dr.chen@example.com",
        "priority": 3,
        "notify_for_missed_dose": False,
        "notify_for_emergency": True,
    },
]

DRUG_INTERACTIONS = [
    {
        "med1_name": "Aspirin",
        "med2_name": "Lisinopril",
        "severity": "moderate",
        "description": "Aspirin may reduce the antihypertensive effect of Lisinopril. NSAIDs and salicylates can antagonise ACE inhibitors.",
        "recommendation": "Monitor blood pressure regularly. Use the lowest effective aspirin dose.",
        "source": "drugs.com",
        "risk_factors": json.dumps(["elderly patient", "chronic kidney disease", "heart failure"]),
    },
    {
        "med1_name": "Atorvastatin",
        "med2_name": "Amlodipine",
        "severity": "minor",
        "description": "Amlodipine may slightly increase Atorvastatin plasma levels due to CYP3A4 inhibition.",
        "recommendation": "Monitor for muscle pain or weakness. No dose change usually required.",
        "source": "rxlist",
        "risk_factors": json.dumps(["high statin dose", "renal impairment"]),
    },
    {
        "med1_name": "Metformin",
        "med2_name": "Omeprazole",
        "severity": "minor",
        "description": "Omeprazole may slightly increase Metformin exposure by altering gut pH and absorption.",
        "recommendation": "No action required. Routine monitoring of blood glucose.",
        "source": "drugs.com",
        "risk_factors": json.dumps(["high metformin dose"]),
    },
    {
        "med1_name": "Aspirin",
        "med2_name": "Amlodipine",
        "severity": "minor",
        "description": "Combined use may enhance the antihypertensive effect and increase bleeding risk.",
        "recommendation": "Monitor for signs of hypotension and bruising.",
        "source": "rxlist",
        "risk_factors": json.dumps(["elderly", "concurrent anticoagulants"]),
    },
]

TAKEN_NOTES = [
    None, None, None, None, None, None, None, None,  # most are None
    "Taken with breakfast",
    "Taken on time",
    "Slight nausea after",
    "Forgot morning dose, took at noon",
    "Taken with water",
    "Felt fine",
    None, None, None,
]

CHAT_HISTORIES = [
    {
        "title": "Side effects of Metformin",
        "messages": [
            {"role": "user", "content": "What are the common side effects of Metformin?"},
            {"role": "assistant", "content": "Metformin commonly causes nausea, diarrhea, and stomach upset, especially when first starting the medication. These side effects usually improve after a few weeks as your body adjusts. Taking it with meals significantly reduces gastrointestinal discomfort. In rare cases, it can cause lactic acidosis, particularly in patients with kidney problems. If you experience unusual muscle pain, difficulty breathing, or extreme fatigue, seek medical attention immediately."},
            {"role": "user", "content": "Should I take it with food?"},
            {"role": "assistant", "content": "Yes, taking Metformin with meals significantly reduces gastrointestinal side effects like nausea and diarrhea. The extended-release version (Metformin ER) should be taken with your evening meal for best results. Make sure to swallow tablets whole — don't crush or chew them. Also, stay well hydrated throughout the day while on Metformin."},
        ],
        "days_ago": 30,
    },
    {
        "title": "Blood pressure medication questions",
        "messages": [
            {"role": "user", "content": "Can I take Lisinopril and Amlodipine together?"},
            {"role": "assistant", "content": "Yes, Lisinopril (an ACE inhibitor) and Amlodipine (a calcium channel blocker) are very commonly prescribed together for blood pressure control. They work through different mechanisms, which makes the combination more effective than either drug alone. Lisinopril relaxes blood vessels by blocking angiotensin, while Amlodipine relaxes vessel walls directly. This dual approach often provides better blood pressure control with fewer side effects than increasing the dose of a single medication."},
            {"role": "user", "content": "When should I take them?"},
            {"role": "assistant", "content": "Both medications can be taken at the same time in the morning. Consistency is key — try to take them at the same time every day. If you experience dizziness when standing up (a common side effect), try getting up slowly from sitting or lying positions. Monitor your blood pressure regularly and keep a log to share with your doctor. Avoid potassium supplements or salt substitutes while on Lisinopril."},
        ],
        "days_ago": 20,
    },
    {
        "title": "Missed dose advice",
        "messages": [
            {"role": "user", "content": "I missed my morning Aspirin, should I take it now?"},
            {"role": "assistant", "content": "If you remember within a few hours of your scheduled time, go ahead and take your low-dose Aspirin (81mg). However, if it's close to your next scheduled dose, simply skip the missed dose and continue with your regular schedule. Never double up on doses to make up for a missed one. Low-dose aspirin is taken for cardiovascular protection, so occasional missed doses aren't an emergency, but consistent daily intake is important for optimal benefit."},
            {"role": "user", "content": "Does it matter if I take it morning or evening?"},
            {"role": "assistant", "content": "For low-dose Aspirin (81mg) used for heart protection, the most important thing is consistency rather than specific timing. However, many doctors recommend morning dosing because that's when platelet activity and cardiovascular risk tend to be highest. Taking it with breakfast also helps reduce any stomach irritation. Pick a time that works best for your routine and stick with it."},
        ],
        "days_ago": 15,
    },
    {
        "title": "Cholesterol medication timing",
        "messages": [
            {"role": "user", "content": "Why is Atorvastatin taken at night?"},
            {"role": "assistant", "content": "Statins like Atorvastatin are traditionally recommended for evening dosing because the liver produces most cholesterol at night. However, Atorvastatin specifically has a long half-life (about 14 hours), which means it remains active in your body throughout the day regardless of when you take it. So while evening dosing is conventional, the most important thing is to take it consistently at whatever time works best for you. Your 9 PM dose is perfectly timed!"},
            {"role": "user", "content": "Can I eat grapefruit while taking it?"},
            {"role": "assistant", "content": "Grapefruit and grapefruit juice can interact with Atorvastatin by inhibiting the CYP3A4 enzyme that metabolizes the drug, potentially increasing statin levels in your blood and the risk of side effects like muscle pain. While occasional small amounts may be fine, it's best to avoid regular grapefruit consumption. If you enjoy citrus, oranges, lemons, and limes are safe alternatives that don't interact with statins."},
        ],
        "days_ago": 7,
    },
    {
        "title": "Vitamin D and Calcium interaction",
        "messages": [
            {"role": "user", "content": "Should I take Vitamin D3 and Calcium together?"},
            {"role": "assistant", "content": "Vitamin D3 actually helps your body absorb calcium better, so taking them in the same general timeframe is beneficial. However, they don't need to be taken at the exact same moment. Your current schedule has Vitamin D3 at 9 AM and Calcium Carbonate at noon and 6 PM, which is a great setup. Vitamin D3 is fat-soluble, so taking it with a meal containing some fat improves absorption. Calcium Carbonate is best absorbed with food due to the stomach acid needed to dissolve it."},
            {"role": "user", "content": "How do I know if I'm getting enough Vitamin D?"},
            {"role": "assistant", "content": "The best way to check is through a simple blood test called 25-hydroxyvitamin D. Normal levels are typically between 30-50 ng/mL. Your 1000 IU daily dose is a standard maintenance dose for adults. Symptoms of deficiency include fatigue, bone pain, muscle weakness, and mood changes. Since you're 72, adequate Vitamin D is especially important for bone health and fall prevention. Your doctor can adjust the dose based on your blood levels at your next checkup."},
        ],
        "days_ago": 2,
    },
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_or_create_user(username, email, full_name, role, phone=None):
    user = User.query.filter_by(username=username).first()
    if user:
        print(f"   ↩  User '{username}' already exists (ID {user.id})")
        return user, False
    user = User(
        username=username, email=email, full_name=full_name,
        role=role, phone=phone, email_verified=True,
    )
    user.set_password(PASSWORD)
    db.session.add(user)
    db.session.flush()
    print(f"   ✚  Created user '{username}' (ID {user.id})")
    return user, True


def get_or_create_medication(user_id, med_data):
    med = Medication.query.filter_by(user_id=user_id, name=med_data["name"]).first()
    if med:
        print(f"   ↩  Medication '{med.name}' already exists (ID {med.id})")
        return med, False
    med = Medication(user_id=user_id, reminder_enabled=True, **med_data)
    db.session.add(med)
    db.session.flush()
    print(f"   ✚  Added medication: {med.name} ({med.dosage})")
    return med, True


def ensure_relationship(caregiver_id, senior_id):
    rel = CaregiverSenior.query.filter_by(
        caregiver_id=caregiver_id, senior_id=senior_id
    ).first()
    if rel:
        print(f"   ↩  Relationship already exists (ID {rel.id})")
        return rel, False
    rel = CaregiverSenior(
        caregiver_id=caregiver_id, senior_id=senior_id,
        status="accepted", relationship_type="healthcare_provider",
    )
    db.session.add(rel)
    db.session.flush()
    print(f"   ✚  Linked caregiver → senior")
    return rel, True


def ensure_emergency_contact(user_id, contact_data):
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


def ensure_drug_interaction(med1_id, med2_id, ix_data):
    existing = MedicationInteraction.query.filter_by(
        medication1_id=med1_id, medication2_id=med2_id
    ).first()
    if not existing:
        existing = MedicationInteraction.query.filter_by(
            medication1_id=med2_id, medication2_id=med1_id
        ).first()
    if existing:
        print(f"   ↩  Interaction already exists (ID {existing.id})")
        return existing, False
    ix = MedicationInteraction(
        medication1_id=med1_id, medication2_id=med2_id,
        severity=ix_data["severity"], description=ix_data["description"],
        recommendation=ix_data["recommendation"], source=ix_data["source"],
        risk_factors=ix_data["risk_factors"],
    )
    db.session.add(ix)
    db.session.flush()
    print(f"   ✚  Added interaction: {ix.severity}")
    return ix, True


def generate_medication_logs(senior_id, medications):
    """Generate 90 days of realistic adherence data with anomaly weeks."""
    existing = MedicationLog.query.filter_by(user_id=senior_id).count()
    if existing > 0:
        print(f"   ↩  {existing} medication logs already exist — skipping")
        return existing

    print(f"   📊 Generating {LOG_DAYS} days of adherence data …")
    logs_created = 0
    taken_count = 0
    total_slots = 0

    for days_ago in range(LOG_DAYS, -1, -1):
        log_date = TODAY - timedelta(days=days_ago)
        day_number = LOG_DAYS - days_ago  # 0..90
        is_weekend = log_date.weekday() >= 5

        # Phase-based adherence
        if day_number <= 30:
            base_rate = 0.75
        elif day_number <= 60:
            base_rate = 0.88
        else:
            base_rate = 0.92

        # Weekend penalty
        if is_weekend:
            base_rate -= 0.08

        # Anomaly weeks: illness (days 29-35) and travel (days 64-70)
        if 29 <= day_number <= 35:
            base_rate = 0.45  # illness episode
        elif 64 <= day_number <= 70:
            base_rate = 0.50  # travel period

        for med in medications:
            # Only generate logs if medication was active on that date
            if med.start_date and log_date < med.start_date:
                continue

            times = json.loads(med.custom_reminder_times or "[]")
            if not times:
                times = ["08:00"]

            for time_str in times:
                total_slots += 1
                try:
                    h, m = map(int, time_str.split(":"))
                except ValueError:
                    h, m = 8, 0

                # Adjust per priority
                rate = base_rate
                if med.priority == "high":
                    rate += 0.05
                elif med.priority == "low":
                    rate -= 0.03

                rate = max(0.0, min(1.0, rate))
                took = random.random() < rate

                scheduled_dt = datetime.combine(
                    log_date, time(hour=h, minute=m)
                )

                if took:
                    taken_count += 1
                    # Timing variance
                    r = random.random()
                    if r < 0.70:
                        # Within ±15 minutes
                        variance = random.randint(-15, 15)
                    elif r < 0.90:
                        # 15-60 minutes late
                        variance = random.randint(15, 60)
                    else:
                        # 1-3 hours late
                        variance = random.randint(60, 180)

                    taken_dt = scheduled_dt + timedelta(minutes=variance)
                    verified_cam = random.random() < 0.35

                    log = MedicationLog(
                        medication_id=med.id,
                        user_id=senior_id,
                        taken_at=taken_dt,
                        scheduled_time=scheduled_dt,
                        taken_correctly=True,
                        status="verified",
                        verified_by_camera=verified_cam,
                        verification_confidence=round(random.uniform(0.80, 0.99), 2) if verified_cam else None,
                        verification_method="auto" if verified_cam else "manual",
                        notes=random.choice(TAKEN_NOTES),
                    )
                    db.session.add(log)
                    logs_created += 1
                else:
                    # Missed dose
                    log = MedicationLog(
                        medication_id=med.id,
                        user_id=senior_id,
                        taken_at=scheduled_dt,
                        scheduled_time=scheduled_dt,
                        taken_correctly=False,
                        status="missed",
                        notes=random.choice([None, "Forgot", "Felt unwell", "Away from home"]),
                    )
                    db.session.add(log)
                    logs_created += 1

        # Batch flush every 10 days to avoid memory buildup
        if days_ago % 10 == 0:
            db.session.flush()

    db.session.flush()
    actual_rate = round(taken_count / max(total_slots, 1) * 100, 1)
    print(f"   ✅ Created {logs_created} logs ({actual_rate}% overall adherence over {LOG_DAYS} days)")
    return logs_created


def create_health_incidents(senior_id):
    """Create 6 health incident records."""
    existing = HealthIncident.query.filter_by(user_id=senior_id).count()
    if existing > 0:
        print(f"   ↩  {existing} health incidents already exist — skipping")
        return existing

    incidents = [
        {
            "incident_type": "missed_doses",
            "severity": "medium",
            "status": "resolved",
            "detected_at": NOW - timedelta(days=55),
            "resolved_at": NOW - timedelta(days=53),
            "auto_detected": True,
            "confidence": 0.87,
            "detection_method": "lstm_anomaly",
            "caregiver_notified": True,
            "notes": "Missed 3 consecutive Metformin doses",
        },
        {
            "incident_type": "anomaly_detected",
            "severity": "critical",
            "status": "resolved",
            "detected_at": NOW - timedelta(days=50),
            "resolved_at": NOW - timedelta(days=45),
            "auto_detected": True,
            "confidence": 0.93,
            "detection_method": "lstm_anomaly",
            "caregiver_notified": True,
            "notes": "Adherence dropped to 45% over 7 days - illness episode",
        },
        {
            "incident_type": "missed_doses",
            "severity": "medium",
            "status": "resolved",
            "detected_at": NOW - timedelta(days=25),
            "resolved_at": NOW - timedelta(days=23),
            "auto_detected": True,
            "confidence": 0.81,
            "detection_method": "lstm_anomaly",
            "caregiver_notified": True,
            "notes": "Missed evening Metformin doses for 2 days",
        },
        {
            "incident_type": "anomaly_detected",
            "severity": "medium",
            "status": "pending",
            "detected_at": NOW - timedelta(days=10),
            "auto_detected": True,
            "confidence": 0.76,
            "detection_method": "lstm_anomaly",
            "caregiver_notified": True,
            "notes": "Adherence pattern shows late-night dose timing shift",
        },
        {
            "incident_type": "refill_needed",
            "severity": "low",
            "status": "pending",
            "detected_at": NOW - timedelta(days=5),
            "auto_detected": True,
            "confidence": 0.95,
            "detection_method": "refill_predictor",
            "caregiver_notified": True,
            "notes": "Metformin supply estimated at 15 days remaining",
        },
        {
            "incident_type": "sos_triggered",
            "severity": "critical",
            "status": "resolved",
            "detected_at": NOW - timedelta(days=20),
            "resolved_at": NOW - timedelta(days=20, hours=-1),
            "auto_detected": False,
            "confidence": 1.0,
            "detection_method": "manual",
            "caregiver_notified": True,
            "notes": "Senior triggered SOS - false alarm, accidentally pressed",
            "contacted": True,
            "contact_method": "phone_noted",
            "contact_notes": "Called Margaret, she confirmed it was accidental. All fine.",
            "contacted_at": NOW - timedelta(days=20, hours=-1),
        },
    ]

    count = 0
    for inc_data in incidents:
        inc = HealthIncident(user_id=senior_id, **inc_data)
        db.session.add(inc)
        count += 1

    db.session.flush()
    print(f"   ✚  Created {count} health incidents")
    return count


def create_chat_histories(senior_id):
    """Create 5 realistic chat history sessions."""
    existing = ChatHistory.query.filter_by(user_id=senior_id).count()
    if existing > 0:
        print(f"   ↩  {existing} chat histories already exist — skipping")
        return existing

    count = 0
    for chat in CHAT_HISTORIES:
        ch = ChatHistory(
            user_id=senior_id,
            session_id=str(uuid.uuid4()),
            title=chat["title"],
            messages=chat["messages"],
        )
        # Backdate the created_at
        ch.created_at = NOW - timedelta(days=chat["days_ago"])
        ch.updated_at = NOW - timedelta(days=chat["days_ago"])
        db.session.add(ch)
        count += 1

    db.session.flush()
    print(f"   ✚  Created {count} chat histories")
    return count


def create_refill_alerts(senior_id, medications):
    """Create refill alerts for medications running low."""
    existing = RefillAlert.query.filter_by(patient_id=senior_id).count()
    if existing > 0:
        print(f"   ↩  {existing} refill alerts already exist — skipping")
        return existing

    count = 0
    for med in medications:
        if med.quantity_remaining and med.initial_quantity:
            pct = med.quantity_remaining / med.initial_quantity
            if pct < 0.35:
                # Calculate estimated days remaining
                times = json.loads(med.custom_reminder_times or "[]")
                doses_per_day = max(len(times), 1)
                days_remaining = med.quantity_remaining // doses_per_day

                if days_remaining <= 30:
                    alert_level = "critical" if days_remaining <= 10 else "warning"

                    alert = RefillAlert(
                        patient_id=senior_id,
                        medication_id=med.id,
                        alert_level=alert_level,
                        days_remaining=days_remaining,
                        predicted_depletion_date=TODAY + timedelta(days=days_remaining),
                        forecast_method="linear",
                        confidence_low=TODAY + timedelta(days=max(days_remaining - 3, 1)),
                        confidence_high=TODAY + timedelta(days=days_remaining + 5),
                        avg_daily_consumption=float(doses_per_day),
                        consumption_variance=round(random.uniform(0.1, 0.5), 2),
                        created_at=NOW - timedelta(days=2),
                    )
                    db.session.add(alert)
                    count += 1

    db.session.flush()
    print(f"   ✚  Created {count} refill alerts")
    return count


def create_audit_entries(senior_id, caregiver_id):
    """Create sample security audit entries for governance page."""
    existing = SecurityAudit.query.filter_by(user_id=caregiver_id).count()
    if existing > 0:
        print(f"   ↩  Audit entries already exist — skipping")
        return

    entries = [
        {"action": "view_senior_dashboard", "target_id": senior_id, "details": "Accessed Margaret Wilson's dashboard"},
        {"action": "export_report", "target_id": senior_id, "details": "Exported adherence report (PDF)"},
        {"action": "acknowledge_alert", "target_id": senior_id, "details": "Acknowledged refill alert for Metformin"},
        {"action": "view_senior_dashboard", "target_id": senior_id, "details": "Reviewed medication schedule"},
        {"action": "contact_patient", "target_id": senior_id, "details": "Called patient regarding SOS alert"},
    ]

    count = 0
    for i, entry in enumerate(entries):
        audit = SecurityAudit(
            user_id=caregiver_id,
            action=entry["action"],
            target_id=entry["target_id"],
            details=entry["details"],
            ip_address="192.168.1.100",
        )
        audit.created_at = NOW - timedelta(days=i * 5 + 1, hours=random.randint(0, 12))
        audit.updated_at = audit.created_at
        db.session.add(audit)
        count += 1

    db.session.flush()
    print(f"   ✚  Created {count} audit entries")


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

def reset_demo_data():
    """Wipe all data owned by rich_senior and rich_caregiver."""
    print("\n🧹 Resetting rich demo data …")
    for username in [SENIOR_USERNAME, CAREGIVER_USERNAME]:
        user = User.query.filter_by(username=username).first()
        if not user:
            continue

        # Delete children first
        SecurityAudit.query.filter_by(user_id=user.id).delete()
        ChatHistory.query.filter_by(user_id=user.id).delete()
        HealthIncident.query.filter_by(user_id=user.id).delete()
        RefillAlert.query.filter_by(patient_id=user.id).delete()
        MedicationLog.query.filter_by(user_id=user.id).delete()
        EmergencyContact.query.filter_by(user_id=user.id).delete()

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
    print("   ✅ All rich demo data removed\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed MedGuardian rich demo environment")
    parser.add_argument("--reset", action="store_true", help="Wipe rich demo data before seeding")
    args = parser.parse_args()

    print()
    print("=" * 60)
    print("🏥  MedGuardian — Rich Demo Environment Seeder (90 days)")
    print("=" * 60)

    app = create_app()

    with app.app_context():
        try:
            if args.reset:
                reset_demo_data()

            # 1. Users
            print("\n👤 Users")
            senior, _ = get_or_create_user(
                SENIOR_USERNAME, SENIOR_EMAIL, SENIOR_FULLNAME, "senior", SENIOR_PHONE
            )
            caregiver, _ = get_or_create_user(
                CAREGIVER_USERNAME, CAREGIVER_EMAIL, CAREGIVER_FULLNAME, "caregiver", CAREGIVER_PHONE
            )

            # 2. Relationship
            print("\n🔗 Caregiver ↔ Senior Link")
            ensure_relationship(caregiver.id, senior.id)

            # 3. Medications
            print("\n💊 Medications")
            med_objects = []
            for md in MEDICATIONS:
                med, _ = get_or_create_medication(senior.id, md)
                med_objects.append(med)

            # 4. Medication Logs (90 days)
            print("\n📊 Medication Logs")
            log_count = generate_medication_logs(senior.id, med_objects)

            # 5. Emergency Contacts
            print("\n🆘 Emergency Contacts")
            for ec_data in EMERGENCY_CONTACTS:
                ensure_emergency_contact(senior.id, ec_data)

            # 6. Drug Interactions
            print("\n⚠️  Drug Interactions")
            med_by_name = {m.name: m.id for m in med_objects}
            for ix_data in DRUG_INTERACTIONS:
                m1_id = med_by_name.get(ix_data["med1_name"])
                m2_id = med_by_name.get(ix_data["med2_name"])
                if m1_id and m2_id:
                    ensure_drug_interaction(m1_id, m2_id, ix_data)
                else:
                    missing = [n for n in [ix_data["med1_name"], ix_data["med2_name"]] if n not in med_by_name]
                    print(f"   ⚠  Skipped interaction — medication(s) not found: {missing}")

            # 7. Health Incidents
            print("\n🚨 Health Incidents")
            incidents_count = create_health_incidents(senior.id)

            # 8. Chat Histories
            print("\n💬 Chat Histories")
            chat_count = create_chat_histories(senior.id)

            # 9. Refill Alerts
            print("\n📦 Refill Alerts")
            refill_count = create_refill_alerts(senior.id, med_objects)

            # 10. Audit Entries
            print("\n🔒 Security Audit Entries")
            create_audit_entries(senior.id, caregiver.id)

            # Commit everything
            db.session.commit()

            # Count totals
            total_logs = MedicationLog.query.filter_by(user_id=senior.id).count()
            total_incidents = HealthIncident.query.filter_by(user_id=senior.id).count()
            active_incidents = HealthIncident.query.filter_by(user_id=senior.id, status="pending").count()
            resolved_incidents = total_incidents - active_incidents
            total_chats = ChatHistory.query.filter_by(user_id=senior.id).count()
            total_contacts = EmergencyContact.query.filter_by(user_id=senior.id).count()
            total_refills = RefillAlert.query.filter_by(patient_id=senior.id).count()

            # Summary
            print()
            print("=" * 60)
            print("✅ Rich Demo Environment Ready")
            print("=" * 60)
            print(f"👵 Senior:    {SENIOR_USERNAME} / {PASSWORD} ({SENIOR_FULLNAME}, 72)")
            print(f"👩‍⚕️ Caregiver:  {CAREGIVER_USERNAME} / {PASSWORD} ({CAREGIVER_FULLNAME})")
            print()
            print(f"💊 Medications: {len(med_objects)}")
            print(f"📊 Medication Logs: {total_logs} over 90 days")
            print(f"⚠️  Health Incidents: {total_incidents} ({active_incidents} active, {resolved_incidents} resolved)")
            print(f"🆘 Emergency Contacts: {total_contacts}")
            print(f"💬 Chat Histories: {total_chats}")
            print(f"🧬 Drug Interactions: {len(DRUG_INTERACTIONS)}")
            print(f"📦 Refill Alerts: {total_refills}")
            print()
            print("Page readiness:")
            print("/dashboard          ✅ stat cards, today's doses")
            print("/medications        ✅ 8 medications listed")
            print("/analytics          ✅ 90 days adherence data")
            print("/chat               ✅ 5 history conversations")
            print("/interactions       ✅ 4 drug interactions")
            print("/anomalies          ✅ active incidents visible")
            print("/caregiver          ✅ Margaret Wilson's data")
            print("/war-room           ✅ active alerts")
            print("/refills            ✅ low stock warnings")
            print("/explainability     ✅ SHAP data available")
            print("/governance         ✅ audit trail")
            print("/schedule           ✅ today's doses scheduled")
            print("=" * 60)
            print()

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
