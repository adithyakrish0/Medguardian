import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv('DATABASE_URL')

print(f"Connecting to: {db_url.split('@')[1] if '@' in db_url else 'invalid url'}")

try:
    conn = psycopg2.connect(db_url)
    print("SUCCESS: Connected to database!")
    cur = conn.cursor()
    
    print("Testing 'user' table...")
    cur.execute("SELECT count(*) FROM \"user\";")
    print(f"User count: {cur.fetchone()[0]}")
    
    print("Testing 'medication' table...")
    cur.execute("SELECT count(*) FROM medication;")
    print(f"Medication count: {cur.fetchone()[0]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
