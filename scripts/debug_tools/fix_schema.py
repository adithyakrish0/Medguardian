from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        print("Adding 'full_name' column to 'user' table...")
        # Use raw SQL to add the column
        db.session.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name VARCHAR(100)'))
        db.session.commit()
        print("✅ Column 'full_name' added successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Failed to add column: {e}")
