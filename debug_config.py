from app import create_app
import os

app = create_app()
print(f"FLASK_ENV: {os.getenv('FLASK_ENV')}")
print(f"DATABASE_URL from env: {os.getenv('DATABASE_URL')}")
print(f"SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
