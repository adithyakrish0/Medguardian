from app import create_app, db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
    
    for table in tables:
        columns = [col['name'] for col in inspector.get_columns(table)]
        print(f"Table '{table}': {columns}")
