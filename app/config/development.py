"""Development configuration"""
from .base import Config


class DevelopmentConfig(Config):
    """Development environment configuration"""
    
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = False  # Disabled to prevent connection pool pressure with eventlet
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False
    # Keep Lax for other endpoints - detect-hand doesn't need auth anyway

    
    # Disable some heavy features in development
    SCHEDULER_ENABLED = True
    VISION_ENABLED = True
    
    # Database Optimization - Restricted for Development/Supabase Free Tier
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 15,
        'max_overflow': 5,        # Allow 5 extra connections beyond pool_size under load
        'pool_timeout': 30,       # Wait 30s for a connection before failing
        'pool_recycle': 300,      # Recycle connections every 5 minutes
        'pool_pre_ping': True,    # Check connection health before using
    }
