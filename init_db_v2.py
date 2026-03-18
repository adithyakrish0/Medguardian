import os
import sys
from run import app, db
from app.models.auth import User

def init_and_seed():
    with app.app_context():
        print("Checking database connection...")
        try:
            # Create tables
            db.create_all()
            print("✅ Database tables created successfully.")
            
            # Check if demo users exist
            print("Seeding demo users...")
            demo_password = 'MedGuardian123'
            
            users_to_create = [
                {'username': 'testsenior', 'email': 'senior@example.com', 'role': 'senior'},
                {'username': 'testcaregiver', 'email': 'caregiver@example.com', 'role': 'caregiver'}
            ]
            
            for user_data in users_to_create:
                existing = User.query.filter_by(username=user_data['username']).first()
                if not existing:
                    user = User(
                        username=user_data['username'], 
                        email=user_data['email'], 
                        role=user_data['role']
                    )
                    user.set_password(demo_password)
                    db.session.add(user)
                    print(f" + Created user: {user_data['username']}")
                else:
                    print(f" - User {user_data['username']} already exists.")
            
            db.session.commit()
            print("✅ Seeding complete.")
            print("\nDemo Credentials:")
            print(" - Username: testsenior (or testcaregiver)")
            print(f" - Password: {demo_password}")
            
        except Exception as e:
            print(f"❌ Error during initialization: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    init_and_seed()
