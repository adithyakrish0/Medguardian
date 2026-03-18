
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone VARCHAR(20)'))
        db.session.commit()
        print("Column 'phone' added to table 'user'")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
