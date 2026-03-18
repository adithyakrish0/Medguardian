
import os
from sqlalchemy.engine.url import make_url
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)

db_url = os.getenv('DATABASE_URL')
engine = create_engine(db_url)
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, username, full_name, role FROM \"user\""))
        users = result.fetchall()
        for u in users:
            print(f"ID: {u[0]}, Username: {u[1]}, Name: {u[2]}, Role: {u[3]}")
except Exception as e:
    print(f"Error: {e}")
