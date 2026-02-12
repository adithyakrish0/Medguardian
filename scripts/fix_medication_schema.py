import sys
import os

# Add the project root directory to the Python path
sys.path.append(os.getcwd())

from app import create_app, db
from sqlalchemy import text

def add_columns():
    app = create_app()
    with app.app_context():
        try:
            # Adding embedding_data column
            print("Trying to add embedding_data column...")
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE medication ADD COLUMN IF NOT EXISTS embedding_data TEXT;"))
                conn.execute(text("ALTER TABLE medication ADD COLUMN IF NOT EXISTS ai_trained BOOLEAN DEFAULT FALSE;"))
                conn.commit()
            print("✅ Successfully added 'embedding_data' and 'ai_trained' columns to 'medication' table.")
        except Exception as e:
            print(f"❌ Error adding columns: {e}")

if __name__ == "__main__":
    add_columns()
