"""Base configuration class with validation"""
import os
from typing import Optional


class Config:
    """Base configuration class"""
    
    # Flask Core
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-change-in-production')
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'development')
    DEBUG: bool = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Database
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        'DATABASE_URL', 
        'sqlite:///instance/medguardian.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ECHO: bool = DEBUG
    
    # Redis
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Security
    WTF_CSRF_ENABLED: bool = os.getenv('WTF_CSRF_ENABLED', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE: bool = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    
    # File Upload
    MAX_CONTENT_LENGTH: int = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
    UPLOAD_FOLDER: str = os.getenv('UPLOAD_FOLDER', 'temp')
    ALLOWED_EXTENSIONS: set = {'png', 'jpg', 'jpeg', 'gif'}
    
    # Vision System
    VISION_ENABLED: bool = os.getenv('VISION_ENABLED', 'True').lower() == 'true'
    YOLO_MODEL_PATH: str = os.getenv('YOLO_MODEL_PATH', 'yolov5s.pt')
    PILL_DETECTION_CONFIDENCE: float = float(os.getenv('PILL_DETECTION_CONFIDENCE', '0.5'))
    
    # Scheduler
    SCHEDULER_ENABLED: bool = os.getenv('SCHEDULER_ENABLED', 'True').lower() == 'true'
    SCHEDULER_API_ENABLED: bool = False
    MISSED_DOSE_CHECK_INTERVAL: int = int(os.getenv('MISSED_DOSE_CHECK_INTERVAL', '3600'))
    
    # Rate Limiting
    RATELIMIT_ENABLED: bool = os.getenv('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_STORAGE_URL: str = os.getenv('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    RATELIMIT_DEFAULT: str = "200 per day, 50 per hour"
    
    # Email Configuration
    MAIL_SERVER: str = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT: int = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS: bool = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL: bool = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_USERNAME: Optional[str] = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD: Optional[str] = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER: str = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com')
    
    # SocketIO
    SOCKETIO_MESSAGE_QUEUE: str = os.getenv('SOCKETIO_MESSAGE_QUEUE', 'redis://localhost:6379/2')
    SOCKETIO_ASYNC_MODE: str = os.getenv('SOCKETIO_ASYNC_MODE', 'threading')
    
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES: int = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', '3600'))
    
    # Tesseract OCR
    TESSERACT_CMD: Optional[str] = os.getenv('TESSERACT_CMD')
    
    @classmethod
    def validate(cls) -> None:
        """Validate critical configuration values"""
        errors = []
        
        if cls.SECRET_KEY in ('dev-secret-change-in-production', 'your-secret-key-here', 'changeme'):
            if cls.FLASK_ENV == 'production':
                errors.append("SECRET_KEY must be changed in production")
        
        if cls.FLASK_ENV == 'production':
            if not cls.SESSION_COOKIE_SECURE:
                errors.append("SESSION_COOKIE_SECURE should be True in production")
            
            if cls.SQLALCHEMY_DATABASE_URI.startswith('sqlite://'):
                errors.append("SQLite not recommended for production, use PostgreSQL")
        
        if cls.MAIL_USERNAME and not cls.MAIL_PASSWORD:
            errors.append("MAIL_PASSWORD required when MAIL_USERNAME is set")
        
        if errors:
            raise ValueError(f"Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors))
    
    @classmethod
    def init_app(cls, app):
        """Initialize app-specific configuration"""
        # Validate configuration
        if cls.FLASK_ENV == 'production':
            cls.validate()
        
        # Set Tesseract path if provided
        if cls.TESSERACT_CMD:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = cls.TESSERACT_CMD
