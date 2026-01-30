import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

try:
    print(f"Connecting to DB to add full_name...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Executing ALTER TABLE...")
    cur.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);')
    print("✅ Column added successfully (or already exists).")
    
    # Verify
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user'")
    cols = [r[0] for r in cur.fetchall()]
    print(f"Final columns in 'user': {cols}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
