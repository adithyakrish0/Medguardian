import os
from dotenv import load_dotenv
load_dotenv(override=True)

db_url = os.environ.get('DATABASE_URL')
print(f"DATABASE_URL from .env: {db_url}")

if db_url and '@' in db_url:
    host = db_url.split('@')[1].split('/')[0]
    print(f"Host: {host}")
else:
    print("DATABASE_URL not found or invalid format")
