"""Production configuration"""
from .base import Config


class ProductionConfig(Config):
    """Production environment configuration"""
    
    DEBUG = False
    TESTING = False
    SQLALCHEMY_ECHO = False
    
    # Strict security for production
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_ENABLED = True
    
    @classmethod
    def init_app(cls, app):
        """Production-specific initialization"""
        super().init_app(app)
        
        # Log to syslog or external service
        import logging
        from logging.handlers import SysLogHandler
        
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)
