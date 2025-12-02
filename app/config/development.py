"""Development configuration"""
from .base import Config


class DevelopmentConfig(Config):
    """Development environment configuration"""
    
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = True  # Log all SQL queries
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False
    
    # Disable some heavy features in development
    SCHEDULER_ENABLED = True
    VISION_ENABLED = True
