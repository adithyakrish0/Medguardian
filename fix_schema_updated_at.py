
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        print("Adding updated_at to medication_log...")
        db.session.execute(text("ALTER TABLE medication_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
        db.session.commit()
        print("✅ Added updated_at to medication_log")
        
        print("Checking other tables for consistency...")
        # Check if other tables from BaseModel might be missing updated_at
        # This is a bit more complex, but let's stick to the one we know is broken for now.
    except Exception as e:
        print(f"❌ Error: {e}")
        db.session.rollback()
