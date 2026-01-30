import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("Listing active connections...")
    cur.execute("SELECT pid, state, query, wait_event_type, wait_event FROM pg_stat_activity WHERE datname = 'postgres' AND pid <> pg_backend_pid();")
    rows = cur.fetchall()
    for row in rows:
        print(f"PID: {row[0]}, State: {row[1]}, Waiting: {row[3]}, Query: {row[2][:100]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
