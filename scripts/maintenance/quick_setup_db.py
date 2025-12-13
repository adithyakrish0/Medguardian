from app import create_app, db
from app.models.auth import User

app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("✅ Database tables created")
    
    # Create test users
    if not User.query.filter_by(username='testsenior').first():
        senior = User(username='testsenior', email='senior@example.com', role='senior')
        senior.set_password('password123')
        db.session.add(senior)
        print("✅ Created testsenior")
    
    if not User.query.filter_by(username='testcaregiver').first():
        caregiver = User(username='testcaregiver', email='caregiver@example.com', role='caregiver')
        caregiver.set_password('password123')
        db.session.add(caregiver)
        print("✅ Created testcaregiver")
    
    db.session.commit()
    print("✅ Database seeded successfully!")
