from app import create_app, db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables in DB: {tables}")
    
    if 'user' in tables:
        from app.models.auth import User
        user_count = User.query.count()
        print(f"User count: {user_count}")
    else:
        print("CRITICAL: 'user' table is missing!")
