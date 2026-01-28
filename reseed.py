from run import app, db
from app.models.auth import User

def seed():
    with app.app_context():
        print("Creating tables...")
        db.create_all()
        
        print("Checking for test user...")
        if not User.query.filter_by(username='testsenior').first():
            print("Creating 'testsenior'...")
            senior = User(username='testsenior', email='senior@example.com', role='senior')
            senior.set_password('password123')
            db.session.add(senior)
            db.session.commit()
            print("✅ 'testsenior' created.")
        else:
            print("ℹ️ 'testsenior' already exists.")

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"❌ Seed failed: {e}")
