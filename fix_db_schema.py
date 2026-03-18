import os
import sys
from flask import Flask

# Add project root to sys.path
sys.path.append('c:\\Users\\Adithyakrishnan\\Desktop\\Medguardian')

from app import create_app, db
from sqlalchemy import text

# Force development environment to ensure .env is loaded
os.environ['FLASK_ENV'] = 'development'

app = create_app()

with app.app_context():
    print("--- Database Schema Fix ---")
    
    # Tables to check (including many potential ones)
    tables = [
        'medication_log', 
        'user', 
        'medication', 
        'caregiver_senior', 
        'medication_interaction', 
        'snooze_log', 
        'emergency_contact', 
        'health_incident', 
        'refill_alert', 
        'chat_history',
        'security_audit'
    ]
    
    for table in tables:
        try:
            # PostgreSQL syntax for adding column if not exists
            # We use double quotes for table names to handle reserved words like "user"
            query = f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;'
            db.session.execute(text(query))
            db.session.commit()
            print(f"✅ Checked/Updated table: {table}")
        except Exception as e:
            db.session.rollback()
            # If table doesn't exist, just skip it
            if "does not exist" in str(e).lower():
                print(f"ℹ️ Table '{table}' does not exist, skipping.")
            else:
                print(f"❌ Error updating table '{table}': {str(e)}")

print("--- Fix Completed ---")
