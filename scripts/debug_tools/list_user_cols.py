from app import create_app, db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    columns = [c['name'] for c in inspector.get_columns('user')]
    print("USER_COLUMNS_START")
    for col in columns:
        print(col)
    print("USER_COLUMNS_END")
