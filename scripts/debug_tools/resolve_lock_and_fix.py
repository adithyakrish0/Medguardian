import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Checking for blocking PIDs...")
    query = """
    SELECT
        blocking_l.pid AS blocking_pid,
        blocking_a.query AS blocking_query,
        blocking_a.state AS blocking_state
    FROM pg_catalog.pg_locks AS active_l
    JOIN pg_catalog.pg_stat_activity AS active_a ON active_a.pid = active_l.pid
    JOIN pg_catalog.pg_locks AS blocking_l ON blocking_l.locktype = active_l.locktype
        AND blocking_l.DATABASE = active_l.DATABASE
        AND blocking_l.relation = active_l.relation
        AND blocking_l.pid != active_l.pid
    JOIN pg_catalog.pg_stat_activity AS blocking_a ON blocking_a.pid = blocking_l.pid
    WHERE NOT active_l.GRANTED;
    """
    cur.execute(query)
    rows = cur.fetchall()
    
    if not rows:
        print("No blocking PIDs found. Trying ALTER TABLE again with timeout...")
        try:
            cur.execute("SET lock_timeout = '10s';")
            cur.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);')
            print("✅ ALTER TABLE successful!")
        except Exception as e:
            print(f"❌ ALTER TABLE failed: {e}")
    else:
        for row in rows:
            print(f"Blocking PID: {row[0]}, State: {row[2]}, Query: {row[1][:100]}")
            print(f"Attempting to terminate PID {row[0]}...")
            try:
                cur.execute(f"SELECT pg_terminate_backend({row[0]})")
                print(f"Terminated PID {row[0]}.")
            except Exception as te:
                print(f"Could not terminate PID {row[0]}: {te}")
                
        print("Re-running ALTER TABLE...")
        try:
            cur.execute("SET lock_timeout = '10s';")
            cur.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);')
            print("✅ ALTER TABLE successful!")
        except Exception as e:
            print(f"❌ ALTER TABLE failed: {e}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
