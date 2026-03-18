import sqlalchemy as sa
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.gnlijhzttaahebknthzu:DNiIRtjBmT9zdFYZ@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

engine = sa.create_engine(DATABASE_URL)

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

with engine.connect() as conn:
    print("--- Database Schema Fix (Lightweight) ---")
    for table in tables:
        try:
            # PostgreSQL syntax
            query = text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;')
            conn.execute(query)
            conn.commit()
            print(f"✅ Checked/Updated table: {table}")
        except Exception as e:
            # conn.rollback() is implicit in some contexts but let's be safe
            if "does not exist" in str(e).lower():
                print(f"ℹ️ Table '{table}' does not exist, skipping.")
            else:
                print(f"❌ Error updating table '{table}': {str(e)}")
    print("--- Fix Completed ---")
