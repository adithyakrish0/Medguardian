import psycopg2
import sys

# Testing the pooler URL
# Format: postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
REF = "gnlijhzttaahebknthzu"
PW = "DNiIRtjBmT9zdFYZ"
HOST = "aws-1-ap-south-1.pooler.supabase.com"
PORT = "5432"

try:
    print(f"Attempting to connect to {HOST}:{PORT} (Session Pooler)...")
    conn = psycopg2.connect(
        dbname="postgres",
        user=f"postgres.gnlijhzttaahebknthzu",
        password=PW,
        host=HOST,
        port=PORT,
        sslmode="require"
    )
    print("✅ Connection successful!")
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print(f"Query Result: {cur.fetchone()}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)
