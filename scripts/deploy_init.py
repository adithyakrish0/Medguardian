import os
import sys
import logging
from sqlalchemy import text

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deploy_init")

def init_db():
    app = create_app()
    with app.app_context():
        logger.info("Starting database initialization...")
        
        # 1. Create all tables (this is safe, it won't drop existing ones)
        # This will create the 'security_audit' table if it doesn't exist
        db.create_all()
        logger.info("Verified all tables exist.")
        
        # 2. Check for columns in 'user' table (manual migration for existing DBs)
        try:
            # Check for 'phone'
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='phone'"))
            if not result.fetchone():
                logger.info("Adding 'phone' column to 'user' table...")
                db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN phone VARCHAR(20)"))
                db.session.commit()
            
            # Check for 'full_name'
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='full_name'"))
            if not result.fetchone():
                logger.info("Adding 'full_name' column to 'user' table...")
                db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN full_name VARCHAR(100)"))
                db.session.commit()
                logger.info("'full_name' column added successfully.")
        except Exception as e:
            logger.warning(f"Could not check/add 'phone' column: {e}")
            db.session.rollback()

        logger.info("Database initialization complete.")

if __name__ == "__main__":
    init_db()
