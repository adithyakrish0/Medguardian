import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

def insert_raw_logs():
    db_url = os.getenv('DATABASE_URL')
    if not db_url: return
    if db_url.startswith('postgres://'): db_url = db_url.replace('postgres://', 'postgresql://', 1)
    
    engine = create_engine(db_url)
    
    # Get a medication ID for a user
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id FROM medication LIMIT 1"))
        med_id = res.scalar()
        if not med_id:
            print("No medication found. Create one first.")
            return

        # Insert 100 logs for the last 60 days
        now = datetime.now()
        logs = []
        for i in range(100):
            scheduled = now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
            is_verified = random.random() > 0.1
            status = 'verified' if is_verified else 'missed'
            
            # Simple SQL insert
            conn.execute(text("""
                INSERT INTO medication_log (medication_id, user_id, taken_at, scheduled_time, status, taken_correctly, verified_by_camera, created_at)
                VALUES (:m, :u, :t, :s, :st, :tc, :v, :c)
            """), {
                'm': med_id, 'u': 1, 't': scheduled, 's': scheduled, 'st': status, 'tc': is_verified, 'v': True, 'c': now
            })
        conn.commit()
    print("Successfully inserted 100 raw logs.")

if __name__ == "__main__":
    insert_raw_logs()
