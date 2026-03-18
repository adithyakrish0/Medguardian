
import os
from dotenv import load_dotenv
from app import create_app
from app.extensions import db
from app.models.auth import User

load_dotenv(override=True)

app = create_app('development')
with app.app_context():
    try:
        user_count = User.query.count()
        print(f"User count: {user_count}")
        demo_senior = User.query.filter_by(username='demo_senior').first()
        print(f"Demo senior exists: {demo_senior is not None}")
        demo_caregiver = User.query.filter_by(username='demo_caregiver').first()
        print(f"Demo caregiver exists: {demo_caregiver is not None}")
    except Exception as e:
        print(f"Error checking database: {e}")
