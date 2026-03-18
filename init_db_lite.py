"""
Lightweight DB init script — does NOT load AI models.
Directly connects to Supabase and creates tables + demo users.
"""
import os
import sys
from dotenv import load_dotenv
load_dotenv(override=True)

from sqlalchemy import create_engine, text, inspect
from werkzeug.security import generate_password_hash

DB_URL = os.getenv('DATABASE_URL')
if not DB_URL:
    print("❌ DATABASE_URL not set in .env"); sys.exit(1)

engine = create_engine(DB_URL)

# ── Step 1: Test connection ──
print(f"Connecting to: {DB_URL.split('@')[1].split('/')[0]}...")
with engine.connect() as conn:
    r = conn.execute(text("SELECT 1")).fetchone()
    print(f"✅ Database connection OK (result={r[0]})")

# ── Step 2: Check if 'user' table exists ──
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Existing tables: {tables}")

if 'user' not in tables:
    print("\n⚠️  'user' table missing — creating all tables via Flask...")
    # Minimal Flask app just to run create_all
    os.environ['VISION_DISABLED'] = 'true'
    os.environ['SCHEDULER_ENABLED'] = 'False'
    
    from flask import Flask
    from app.extensions import db
    
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = DB_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'init-only'
    app.config['VISION_ENABLED'] = False
    app.config['SCHEDULER_ENABLED'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # Import all models so SQLAlchemy knows about them
        from app.models.auth import User
        from app.models.medication import Medication
        from app.models.relationship import CaregiverSenior
        from app.models.medication_log import MedicationLog
        from app.models.medication_interaction import MedicationInteraction, InteractionCheckResult
        from app.models.snooze_log import SnoozeLog
        from app.models.security_audit import SecurityAudit
        from app.models.refill_alert import RefillAlert
        
        db.create_all()
        print("✅ All tables created!")
        
        # Seed demo users
        demo_pw = generate_password_hash('MedGuardian123')
        
        existing = User.query.filter_by(username='testsenior').first()
        if not existing:
            u = User(username='testsenior', email='senior@example.com', role='senior', password_hash=demo_pw)
            db.session.add(u)
            print(" + Created user: testsenior")
        else:
            print(" - testsenior already exists")
        
        existing = User.query.filter_by(username='testcaregiver').first()
        if not existing:
            u = User(username='testcaregiver', email='caregiver@example.com', role='caregiver', password_hash=demo_pw)
            db.session.add(u)
            print(" + Created user: testcaregiver")
        else:
            print(" - testcaregiver already exists")
        
        db.session.commit()
        print("\n✅ Done! Demo credentials:")
        print("   Username: testsenior  |  Password: MedGuardian123")
        print("   Username: testcaregiver  |  Password: MedGuardian123")
else:
    print("✅ 'user' table exists.")
    # Just check/seed users
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, username, role FROM \"user\"")).fetchall()
        print(f"Users in DB: {len(rows)}")
        for r in rows:
            print(f"  id={r[0]} username={r[1]} role={r[2]}")
        
        if not any(r[1] == 'testsenior' for r in rows):
            demo_pw = generate_password_hash('MedGuardian123')
            conn.execute(text(
                "INSERT INTO \"user\" (username, email, password_hash, role, created_at, updated_at) "
                "VALUES (:u, :e, :p, :r, NOW(), NOW())"
            ), {"u": "testsenior", "e": "senior@example.com", "p": demo_pw, "r": "senior"})
            conn.commit()
            print(" + Created testsenior")
        
        if not any(r[1] == 'testcaregiver' for r in rows):
            demo_pw = generate_password_hash('MedGuardian123')
            conn.execute(text(
                "INSERT INTO \"user\" (username, email, password_hash, role, created_at, updated_at) "
                "VALUES (:u, :e, :p, :r, NOW(), NOW())"
            ), {"u": "testcaregiver", "e": "caregiver@example.com", "p": demo_pw, "r": "caregiver"})
            conn.commit()
            print(" + Created testcaregiver")
        
        print("\n✅ Done! Demo credentials:")
        print("   Username: testsenior  |  Password: MedGuardian123")
        print("   Username: testcaregiver  |  Password: MedGuardian123")
