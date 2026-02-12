"""
Cleanup Test Data Script for MedGuardian

Removes all synthetic test data created by generate_synthetic_data.py

Usage:
    python scripts/cleanup_test_data.py
    python scripts/cleanup_test_data.py --dry-run  # Preview without deleting
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse


def cleanup_test_data(dry_run: bool = False):
    """Remove all TEST_ prefixed users, medications, and logs."""
    
    from app import create_app
    from app.extensions import db
    from app.models.user import User
    from app.models.medication import Medication
    from app.models.medication_log import MedicationLog
    
    app = create_app()
    
    with app.app_context():
        print(f"\n{'='*60}")
        print("MedGuardian Test Data Cleanup")
        print(f"{'='*60}")
        print(f"Mode: {'DRY RUN (no deletions)' if dry_run else 'DELETE MODE'}")
        print(f"{'='*60}\n")
        
        # Find test users
        test_users = User.query.filter(User.username.like('TEST_%')).all()
        print(f"Found {len(test_users)} test users:")
        
        total_logs = 0
        total_meds = 0
        
        for user in test_users:
            # Count associated data
            meds = Medication.query.filter_by(user_id=user.id).all()
            logs = MedicationLog.query.filter_by(user_id=user.id).count()
            
            total_meds += len(meds)
            total_logs += logs
            
            print(f"  - {user.username} (ID: {user.id})")
            print(f"    └── {len(meds)} medications, {logs} logs")
            
            if not dry_run:
                # Delete logs first (foreign key constraint)
                MedicationLog.query.filter_by(user_id=user.id).delete()
                
                # Delete medications
                Medication.query.filter_by(user_id=user.id).delete()
                
                # Delete user
                db.session.delete(user)
        
        if not dry_run and test_users:
            db.session.commit()
        
        print(f"\n{'='*60}")
        print("CLEANUP SUMMARY")
        print(f"{'='*60}")
        print(f"Users:       {len(test_users)} {'deleted' if not dry_run else '(would delete)'}")
        print(f"Medications: {total_meds} {'deleted' if not dry_run else '(would delete)'}")
        print(f"Logs:        {total_logs} {'deleted' if not dry_run else '(would delete)'}")
        
        if dry_run:
            print(f"\n⚠️ DRY RUN - No data was deleted")
            print("   Run without --dry-run to delete data")
        else:
            print(f"\n✅ Test data cleanup complete")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Cleanup synthetic test data')
    parser.add_argument('--dry-run', action='store_true', help='Preview without deleting')
    args = parser.parse_args()
    
    cleanup_test_data(dry_run=args.dry_run)
