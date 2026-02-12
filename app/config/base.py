"""
Base Configuration for MedGuardian
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'sqlite:///instance/medguardian.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database Optimization
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
    }
    
    # CSRF Protection
    WTF_CSRF_ENABLED = os.getenv('WTF_CSRF_ENABLED', 'True') == 'True'
    WTF_CSRF_TIME_LIMIT = None  # No time limit
    
    # Session
    SESSION_COOKIE_HTTPONLY = os.getenv('SESSION_COOKIE_HTTPONLY', 'True') == 'True'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # File Upload
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'temp')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    
    # Vision System
    VISION_ENABLED = os.getenv('VISION_ENABLED', 'True') == 'True'
    YOLO_MODEL_PATH = os.getenv('YOLO_MODEL_PATH', 'yolov5s.pt')
    PILL_DETECTION_CONFIDENCE = float(os.getenv('PILL_DETECTION_CONFIDENCE', 0.5))
    
    # Scheduler
    SCHEDULER_ENABLED = os.getenv('SCHEDULER_ENABLED', 'True') == 'True'
    MISSED_DOSE_CHECK_INTERVAL = int(os.getenv('MISSED_DOSE_CHECK_INTERVAL', 3600))  # 1 hour
    
    # Rate Limiting
    RATELIMIT_ENABLED = os.getenv('RATELIMIT_ENABLED', 'True') == 'True'
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'memory://')
    
    # Email (optional in development)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com')
    
    # JWT (if using REST API authentication)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 1)))
    
    # Telegram
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    TELEGRAM_BOT_USERNAME = os.getenv('TELEGRAM_BOT_USERNAME', 'MedGuardianpy_bot')
    
    # Google Gemini AI
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Tesseract OCR
    TESSERACT_CMD = os.getenv('TESSERACT_CMD')  # Optional, if not in PATH
    
    @staticmethod
    def init_app(app):
        """Initialize application with config-specific settings"""
        # Create upload folder if it doesn't exist
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Configure Tesseract if specified
        if app.config['TESSERACT_CMD']:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = app.config['TESSERACT_CMD']
