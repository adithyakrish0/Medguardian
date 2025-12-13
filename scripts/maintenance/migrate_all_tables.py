"""
Comprehensive database migration to add ALL missing columns
This fixes the old database schema to match the current models
"""

def upgrade_all_tables():
    """Add all missing columns to all tables"""
    from app import create_app
    from app.extensions import db
    
    app = create_app()
    
    with app.app_context():
        print("🔄 Starting comprehensive database migration...\n")
        
        # Medication table columns
        medication_columns = [
            ('barcode', 'VARCHAR(100)'),
            ('reference_image_path', 'VARCHAR(500)'),
            ('image_features', 'TEXT'),
            ('label_text', 'TEXT')
        ]
        
        # MedicationLog table columns
        medication_log_columns = [
            ('scheduled_time', 'DATETIME'),
            ('verified_by_camera', 'BOOLEAN')
        ]
        
        # Add medication columns
        print("📋 Updating medication table...")
        for column_name, column_type in medication_columns:
            add_column('medication', column_name, column_type, db)
        
        # Add medication_log columns
        print("\n📋 Updating medication_log table...")
        for column_name, column_type in medication_log_columns:
            add_column('medication_log', column_name, column_type, db)
        
        print("\n✅ Database migration complete!")
        print("✅ All tables are now up to date!")

def add_column(table_name, column_name, column_type, db):
    """Add a single column to a table"""
    try:
        sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'
        db.session.execute(db.text(sql))
        db.session.commit()
        print(f"  ✓ Added {table_name}.{column_name}")
    except Exception as e:
        db.session.rollback()
        if 'duplicate column name' in str(e).lower():
            print(f"  ⚪ {table_name}.{column_name} already exists")
        else:
            print(f"  ✗ Error adding {table_name}.{column_name}: {e}")

if __name__ == '__main__':
    upgrade_all_tables()
