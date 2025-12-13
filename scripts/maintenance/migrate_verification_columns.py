"""
Migration script to add new verification columns
Run this after updating the model
"""

def upgrade_database():
    """Add new columns to medication table"""
    from app import create_app
    from app.extensions import db
    
    app = create_app()
    
    with app.app_context():
        # Add columns using raw SQL
        columns_to_add = [
            ('barcode', 'VARCHAR(100)'),
            ('reference_image_path', 'VARCHAR(500)'),
            ('image_features', 'TEXT'),
            ('label_text', 'TEXT')
        ]
        
        for column_name, column_type in columns_to_add:
            try:
                sql = f'ALTER TABLE medication ADD COLUMN {column_name} {column_type}'
                db.session.execute(db.text(sql))
                db.session.commit()
                print(f"✓ Added {column_name} column")
            except Exception as e:
                db.session.rollback()
                if 'duplicate column name' in str(e).lower():
                    print(f"  {column_name} column already exists")
                else:
                    print(f"✗ Error adding {column_name}: {e}")
        
        print("\n✅ Database migration complete!")

if __name__ == '__main__':
    upgrade_database()
