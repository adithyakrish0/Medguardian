
import os
from sqlalchemy.engine.url import make_url
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)

db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("DATABASE_URL not found in .env")
    exit(1)

# Mask the password for printing
u = make_url(db_url)
print(f"Connecting to: {u.host}:{u.port}/{u.database} as {u.username}")

engine = create_engine(db_url)
try:
    with engine.connect() as conn:
        # Check if user table exists
        try:
            result = conn.execute(text("SELECT count(*) FROM \"user\""))
            count = result.scalar()
            print(f"User count: {count}")
            
            # Check for demo users
            demo_users = conn.execute(text("SELECT username FROM \"user\" WHERE username IN ('demo_senior', 'demo_caregiver')")).fetchall()
            print(f"Demo users found: {[u[0] for u in demo_users]}")
        except Exception as e:
            print(f"User table check failed: {e}")
            
except Exception as e:
    print(f"Connection Error: {e}")
