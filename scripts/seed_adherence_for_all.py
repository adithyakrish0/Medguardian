#!/usr/bin/env python3
"""
Seed Adherence Logs for ALL existing users who have medications.
This adds 30 days of realistic medication history so the dashboard chart works.
"""

import sys, os, random, json
from datetime import datetime, timedelta, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.auth import User
from app.models.medication import Medication
from app.models.medication_log import MedicationLog


def seed_logs_for_user(user):
    """Seed 30 days of adherence logs for a user's medications."""
    meds = Medication.query.filter_by(user_id=user.id).all()
    if not meds:
        print(f"   ⏭  {user.username} (ID {user.id}) — no medications, skipping")
        return 0

    # Clear existing logs for this user
    existing = MedicationLog.query.filter_by(user_id=user.id).delete()
    if existing:
        print(f"   🧹 Cleared {existing} old logs for {user.username}")

    today = date.today()
    logs_created = 0

    for days_ago in range(30, -1, -1):
        log_date = today - timedelta(days=days_ago)
        is_weekend = log_date.weekday() >= 5
        # ~85% weekday, ~70% weekend
        base_rate = 0.70 if is_weekend else 0.88

        for med in meds:
            # Parse reminder times
            try:
                times = json.loads(med.custom_reminder_times or '[]')
            except Exception:
                times = []

            if not times:
                # If no custom times, infer from time-of-day flags
                if getattr(med, 'morning', False):
                    times.append('08:00')
                if getattr(med, 'afternoon', False):
                    times.append('13:00')
                if getattr(med, 'evening', False):
                    times.append('20:00')
                if not times:
                    times = ['09:00']

            for time_str in times:
                try:
                    h, m = map(int, time_str.split(':'))
                except Exception:
                    h, m = 9, 0

                priority_boost = 1.0 if getattr(med, 'priority', 'normal') == 'high' else 0.95
                took = random.random() < (base_rate * priority_boost)

                if took:
                    variance = random.randint(-20, 45)
                    taken_dt = datetime.combine(log_date, datetime.min.time().replace(hour=h, minute=m))
                    taken_dt += timedelta(minutes=variance)

                    log = MedicationLog(
                        medication_id=med.id,
                        user_id=user.id,
                        taken_at=taken_dt,
                        taken_correctly=True,
                        status='verified',
                        verified_by_camera=random.random() < 0.35,
                        verification_method='auto' if random.random() < 0.5 else 'manual',
                        notes=None
                    )
                    db.session.add(log)
                    logs_created += 1
                else:
                    # 40% chance we log a skip explicitly
                    if random.random() < 0.4:
                        scheduled_dt = datetime.combine(log_date, datetime.min.time().replace(hour=h, minute=m))
                        log = MedicationLog(
                            medication_id=med.id,
                            user_id=user.id,
                            taken_at=scheduled_dt,
                            taken_correctly=False,
                            status='skipped',
                            notes=random.choice(['Forgot', 'Felt unwell', 'Ran out', None])
                        )
                        db.session.add(log)
                        logs_created += 1

    db.session.flush()
    print(f"   ✅ {user.username} (ID {user.id}): {len(meds)} meds → {logs_created} logs seeded")
    return logs_created


def main():
    print("\n" + "=" * 60)
    print("📊 Seeding Adherence Logs for All Users")
    print("=" * 60 + "\n")

    app = create_app()

    with app.app_context():
        try:
            users = User.query.filter_by(role='senior').all()
            total = 0
            for u in users:
                total += seed_logs_for_user(u)

            db.session.commit()
            print(f"\n{'=' * 60}")
            print(f"✅ Done! Created {total} logs across {len(users)} senior users.")
            print(f"{'=' * 60}\n")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    main()
