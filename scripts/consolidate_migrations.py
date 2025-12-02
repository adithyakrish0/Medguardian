"""
Database migration script - Consolidates all previous migrations
Run this after updating models to BaseModel
"""
from app import create_app, db
from flask_migrate import init, migrate, upgrade
import os

def consolidate_migrations():
    """Consolidate all migrations into a clean state"""
    app = create_app()
    
    with app.app_context():
        print("🔄 Consolidating database migrations...")
        
        # Check if migrations folder exists
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        
        if not os.path.exists(migrations_dir):
            print("📁 Initializing Flask-Migrate...")
            os.system('flask db init')
        
        print("📝 Creating new migration for BaseModel updates...")
        os.system('flask db migrate -m "Add BaseModel with timestamps and indexes"')
        
        print("⬆️ Applying migrations...")
        os.system('flask db upgrade')
        
        print("✅ Database migration complete!")
        print("\nIndexes added:")
        print("  - medication.user_id")
        print("  - medication.name")
        print("  - medication.start_date")
        print("  - medication.end_date")
        print("  - medication.priority")
        print("  - medication_log.medication_id")
        print("  - medication_log.user_id")
        print("  - medication_log.taken_at")
        print("  - user.username")
        print("  - user.email")
        print("  - user.role")

if __name__ == '__main__':
    consolidate_migrations()
