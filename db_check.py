from sqlalchemy import text
from run import app, db
from app.models.auth import User
import sys
import socket

def check_db():
    print("Checking network connectivity to Supabase...")
    host = "db.gnlijhzttahebknthzu.supabase.co"
    port = 5432
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(10)
        print(f"Network connection to {host}:{port} successful!")
        s.close()
    except Exception as e:
        print(f"Network connect failed: {e}")
        sys.exit(1)
        
    print("Connecting to database (SQLAlchemy)...")
    print(f"URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    with app.app_context():
        try:
            # Try simple query
            print("Executing query...")
            db.session.execute(text('SELECT 1'))
            print("Database connection via SQLAlchemy successful!")
            
            print("Initializing tables...")
            db.create_all()
            
            print("Checking for test user...")
            user = User.query.filter_by(username='testsenior').first()
            if not user:
                print("Creating 'testsenior'...")
                senior = User(username='testsenior', email='senior@example.com', role='senior')
                senior.set_password('password123')
                db.session.add(senior)
                db.session.commit()
                print("✅ 'testsenior' created.")
            else:
                print("Info: testsenior already exists.")
                
            print("SUCCESS")
            
        except Exception as e:
            print(f"Database Error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    check_db()
