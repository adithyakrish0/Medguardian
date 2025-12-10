# app/models/auth.py
from app.extensions import db
from app.models.base import BaseModel
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, BaseModel):
    __tablename__ = 'user'
    
    username = db.Column(db.String(100), nullable=False, unique=True, index=True)
    email = db.Column(db.String(100), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(200))
    role = db.Column(db.String(20), nullable=False, default='senior', index=True)
    
    # Telegram integration
    telegram_chat_id = db.Column(db.String(50), nullable=True, unique=True)
    
    # Add relationship to medications
    medications = db.relationship('Medication', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'
