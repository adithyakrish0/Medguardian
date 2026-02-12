"""
Add status column to medication_log table and backfill missed doses
"""
from app import create_app
from app.extensions import db
from app.models.medication_log import MedicationLog
from app.models.medication import Medication
from app.models.auth import User
from sqlalchemy import text
from datetime import datetime, timedelta

def add_status_column():
    """Add status column to medication_log table if it doesn't exist"""
    try:
        # Check if column exists
        result = db.session.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='medication_log' AND column_name='status'"
        ))
        if result.fetchone():
            print("✅ Status column already exists")
            return True
        
        # Add the column
        db.session.execute(text(
            "ALTER TABLE medication_log ADD COLUMN status VARCHAR(20) DEFAULT 'verified'"
        ))
        db.session.commit()
        print("✅ Status column added successfully")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding status column: {e}")
        return False


def backfill_missed_doses():
    """
    Backfill missed dose entries for all past days where medications were scheduled
    but no logs exist.
    """
    print("\n📊 Starting backfill of missed doses...")
    
    now = datetime.now()
    today = now.date()
    
    # Get all medications
    medications = Medication.query.all()
    print(f"Found {len(medications)} medications to check")
    
    total_created = 0
    
    for med in medications:
        # Get the medication's creation date
        med_start = med.created_at.date() if med.created_at else med.start_date
        if not med_start:
            continue
        
        # Limit backfill to last 30 days to avoid creating too many entries
        earliest_date = max(med_start, today - timedelta(days=30))
        
        # Check each day from earliest_date to yesterday
        current_date = earliest_date
        while current_date < today:
            # Get scheduled times for this medication on this day
            reminder_times = med.get_reminder_times()
            
            for time_str in reminder_times:
                try:
                    h, m = map(int, time_str.split(':'))
                    scheduled_dt = datetime.combine(current_date, datetime.min.time().replace(hour=h, minute=m))
                    
                    # Check if log exists for this dose
                    window_start = scheduled_dt - timedelta(hours=1)
                    window_end = scheduled_dt + timedelta(hours=2)
                    
                    existing_log = MedicationLog.query.filter_by(
                        medication_id=med.id,
                        user_id=med.user_id
                    ).filter(
                        MedicationLog.taken_at >= window_start,
                        MedicationLog.taken_at <= window_end
                    ).first()
                    
                    if not existing_log:
                        # No log exists - create a missed entry
                        missed_log = MedicationLog(
                            medication_id=med.id,
                            user_id=med.user_id,
                            taken_at=scheduled_dt,
                            scheduled_time=scheduled_dt,
                            taken_correctly=False,
                            status='missed',
                            notes='Backfilled - no response recorded'
                        )
                        db.session.add(missed_log)
                        total_created += 1
                        
                except (ValueError, AttributeError):
                    continue
            
            current_date += timedelta(days=1)
        
        # Commit every 10 medications to avoid huge transactions
        if total_created % 100 == 0 and total_created > 0:
            db.session.commit()
            print(f"  Created {total_created} missed dose entries so far...")
    
    # Final commit
    db.session.commit()
    print(f"\n✅ Backfill complete! Created {total_created} missed dose entries")
    return total_created


def update_legacy_logs():
    """Update legacy logs without status to have proper status based on taken_correctly"""
    print("\n🔄 Updating legacy logs...")
    
    # Find logs without status set
    legacy_logs = MedicationLog.query.filter(
        (MedicationLog.status == None) | (MedicationLog.status == '')
    ).all()
    
    print(f"Found {len(legacy_logs)} legacy logs to update")
    
    for log in legacy_logs:
        if log.taken_correctly:
            log.status = 'verified'
        else:
            # Check notes to differentiate skipped vs missed
            if log.notes and 'missed' in log.notes.lower():
                log.status = 'missed'
            else:
                log.status = 'skipped'
    
    db.session.commit()
    print(f"✅ Updated {len(legacy_logs)} legacy logs")


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # Step 1: Add status column
        add_status_column()
        
        # Step 2: Update legacy logs
        update_legacy_logs()
        
        # Step 3: Backfill missed doses
        backfill_missed_doses()
        
        print("\n🎉 Migration complete!")
