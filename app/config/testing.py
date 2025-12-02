"""Testing configuration"""
from .base import Config


class TestingConfig(Config):
    """Testing environment configuration"""
    
    TESTING = True
    DEBUG = True
    
    # Use in-memory database for tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Disable background tasks
    SCHEDULER_ENABLED = False
    
    # Use mock vision system
    VISION_ENABLED = False
    
    # Fast tests - no real emails
    MAIL_SUPPRESS_SEND = True
