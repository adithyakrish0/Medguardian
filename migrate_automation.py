"""
Database Migration Script - SQLite Compatible
Adds new columns for automation features WITHOUT default constraints
"""

from flask import Flask
from app.extensions import db
from app import create_app
import sqlite3
import os

def run_migration():
    """Add new automation columns to database"""
    app = create_app()
    
    with app.app_context():
        # Get database path
        database_uri = app.config['SQLALCHEMY_DATABASE_URI']
        db_path = database_uri.replace('sqlite:///', '')
        
        # Make sure path is absolute
        if not os.path.isabs(db_path):
            db_path = os.path.join(os.getcwd(), db_path)
        
        print(f"📁 Database path: {db_path}")
        
        try:
            # Connect directly to SQLite
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            print("🔧 Running database migration for automation features...")
            
            # Check existing columns
            cursor.execute("PRAGMA table_info(medication_log)")
            columns = [col[1] for col in cursor.fetchall()]
            print(f"📋 Existing columns in medication_log: {', '.join(columns)}")
            
            # Add verification_confidence
            if 'verification_confidence' not in columns:
                print("\n➕ Adding verification_confidence column...")
                cursor.execute("ALTER TABLE medication_log ADD COLUMN verification_confidence FLOAT")
                print("✅ verification_confidence added")
            else:
                print("\n⏭️  verification_confidence already exists")
            
            # Add verification_method  
            if 'verification_method' not in columns:
                print("➕ Adding verification_method column...")
                cursor.execute("ALTER TABLE medication_log ADD COLUMN verification_method VARCHAR(50)")
                print("✅ verification_method added")
            else:
                print("⏭️  verification_method already exists")
            
            # Add created_at
            if 'created_at' not in columns:
                print("➕ Adding created_at column...")
                cursor.execute("ALTER TABLE medication_log ADD COLUMN created_at DATETIME")
                print("✅ created_at added")
            else:
                print("⏭️  created_at already exists")
            
            # Create health_incidents table
            print("\n🏥 Creating health_incidents table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS health_incidents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    incident_type VARCHAR(50) NOT NULL,
                    detected_at DATETIME NOT NULL,
                    resolved_at DATETIME,
                    auto_detected BOOLEAN,
                    confidence FLOAT,
                    detection_method VARCHAR(50),
                    status VARCHAR(20),
                    severity VARCHAR(20),
                    caregiver_notified BOOLEAN,
                    caregiver_response TEXT,
                    response_time_seconds INTEGER,
                    notes TEXT,
                    metadata TEXT,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES user (id)
                )
            """)
            print("✅ health_incidents table created/verified")
            
            conn.commit()
            
            # Verify changes
            print("\n🔍 Verifying migration...")
            cursor.execute("PRAGMA table_info(medication_log)")
            new_columns = [col[1] for col in cursor.fetchall()]
            print(f"📋 Updated columns in medication_log: {', '.join(new_columns)}")
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='health_incidents'")
            health_table_exists = cursor.fetchone() is not None
            print(f"🏥 health_incidents table exists: {health_table_exists}")
            
            print("\n✅ Migration completed successfully!")
            print("\n🎉 Database is now ready for automation features:")
            print("   ✓ Auto medication verification (camera + confidence tracking)")
            print("   ✓ Fall detection (incident logging)")
            print("   ✓ Inactivity monitoring (wellness checks)")
            print("\n💡 Restart your server to apply changes!")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            raise
        
        finally:
            conn.close()

if __name__ == '__main__':
    run_migration()
