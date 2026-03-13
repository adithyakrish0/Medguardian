import os
from dotenv import load_dotenv

# Load env variables exactly as the app does
load_dotenv(override=True)

print(f"DATABASE_URL in env: {os.getenv('DATABASE_URL')}")
print(f"FLASK_ENV: {os.getenv('FLASK_ENV')}")

# Check for .env in current and parent dirs
print(f"Current dir: {os.getcwd()}")
print(f".env exists here: {os.path.exists('.env')}")
