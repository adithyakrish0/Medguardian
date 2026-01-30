from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS security_audit (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                action VARCHAR(100) NOT NULL,
                target_id INTEGER,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
            )
        """))
        db.session.commit()
        print("Table 'security_audit' created successfully")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
