from app import create_app
import os

app = create_app()
with app.app_context():
    key = os.environ.get('GEMINI_API_KEY')
    print(f"GEMINI_API_KEY present: {bool(key)}")
    if key:
        print(f"Key preview: {key[:5]}...{key[-5:]}")
    else:
        print("GEMINI_API_KEY is MISSING!")
    
    # Check other critical vars
    print(f"DATABASE_URL present: {bool(os.environ.get('DATABASE_URL'))}")
    print(f"FLASK_ENV: {os.environ.get('FLASK_ENV')}")
