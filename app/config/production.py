"""
Production Configuration for MedGuardian
"""
import os
from app.config.base import Config

class ProductionConfig(Config):
    """Production-specific configuration"""
    
    # Flask
    DEBUG = False
    TESTING = False
    
    # SECRET_KEY is validated in init_app (not on import)
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # Safety Monitoring Configuration
    FALL_DETECTION_ENABLED = os.getenv('FALL_DETECTION_ENABLED', 'False') == 'True'
    INACTIVITY_MONITORING_ENABLED = os.getenv('INACTIVITY_MONITORING_ENABLED', 'False') == 'True'
    INACTIVITY_THRESHOLD_MINUTES = int(os.getenv('INACTIVITY_THRESHOLD_MINUTES', 120))
    
    # Security
    SESSION_COOKIE_SECURE = True  # Requires HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600 * 24  # 24 hours
    
    # Database - use PostgreSQL in production (Supabase)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    # If using Supabase/Heroku, fix postgres:// to postgresql://
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,  # Verify connections before using
    }
    
    # Redis for caching and sessions
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    SOCKETIO_MESSAGE_QUEUE = os.getenv('SOCKETIO_MESSAGE_QUEUE', None)  # Optional
    
    # Email - must be configured in production
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/production.log')
    
    # Performance
    SEND_FILE_MAX_AGE_DEFAULT = 31536000  # Cache static files for 1 year
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
    
    # Error reporting
    PROPAGATE_EXCEPTIONS = False  # Handle errors gracefully
    
    @staticmethod
    def init_app(app):
        """Production-specific initialization"""
        # CRITICAL: Validate SECRET_KEY is set
        secret_key = app.config.get('SECRET_KEY')
        if not secret_key or secret_key == 'change-this-to-a-random-secret-key-in-production':
            raise ValueError("PRODUCTION ERROR: SECRET_KEY must be set to a secure random value!")
        
        Config.init_app(app)
        
        # Setup logging
        import logging
        from logging.handlers import RotatingFileHandler
        import os
        
        # Create logs directory
        log_dir = os.path.dirname(ProductionConfig.LOG_FILE)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # File handler with rotation
        file_handler = RotatingFileHandler(
            ProductionConfig.LOG_FILE,
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        ))
        file_handler.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
        
        app.logger.addHandler(file_handler)
        app.logger.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
        app.logger.info('MedGuardian startup (production)')
        
        # Add security headers
        @app.after_request
        def add_security_headers(response):
            for header, value in ProductionConfig.SECURITY_HEADERS.items():
                response.headers[header] = value
            return response
