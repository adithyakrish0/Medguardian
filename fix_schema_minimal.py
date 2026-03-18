
import os
import sqlalchemy
from sqlalchemy import text

db_url = "postgresql://postgres.gnlijhzttaahebknthzu:DNiIRtjBmT9zdFYZ@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

def fix_schema():
    print(f"Connecting to database...")
    engine = sqlalchemy.create_engine(db_url)
    
    with engine.connect() as conn:
        print("Adding updated_at to medication_log...")
        try:
            conn.execute(text("ALTER TABLE medication_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.commit()
            print("✅ Successfully added updated_at to medication_log")
        except Exception as e:
            print(f"⚠️ Could not add updated_at: {e}")

        print("Updating existing rows to have a valid updated_at if null...")
        try:
            conn.execute(text("UPDATE medication_log SET updated_at = created_at WHERE updated_at IS NULL"))
            conn.commit()
            print("✅ Updated null updated_at values")
        except Exception as e:
            print(f"⚠️ Could not update null values: {e}")

if __name__ == "__main__":
    fix_schema()
