"""Add contact tracking columns to health_incidents table.

Run with: python scripts/migrate_contact_columns.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db

app = create_app()

MIGRATIONS = [
    "ALTER TABLE health_incidents ADD COLUMN contacted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE health_incidents ADD COLUMN contacted_at DATETIME NULL",
    "ALTER TABLE health_incidents ADD COLUMN contact_notes VARCHAR(500) NULL",
    "ALTER TABLE health_incidents ADD COLUMN contact_method VARCHAR(50) NULL",
]

with app.app_context():
    for sql in MIGRATIONS:
        col_name = sql.split("ADD COLUMN ")[1].split(" ")[0]
        try:
            db.session.execute(db.text(sql))
            db.session.commit()
            print(f"  ✅ Added column: {col_name}")
        except Exception as e:
            db.session.rollback()
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  ⏭️  Column already exists: {col_name}")
            else:
                print(f"  ⚠️  {col_name}: {e}")

    print("\nDone! Contact tracking columns are ready.")
