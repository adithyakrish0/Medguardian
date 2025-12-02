# app/__init__.py
from flask import Flask, render_template
from .extensions import db, login_manager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO
from flask_mail import Mail
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
socketio = SocketIO()
mail = Mail()


def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration from new config module
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    from app.config import config
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)
    
    # Initialize configuration
    config_class.init_app(app)
    
    # Initialize Flask extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    mail.init_app(app)
    
    # Initialize SocketIO with proper configuration
    # Make it optional if Redis is not available (development mode)
    try:
        socketio_config = {
            'cors_allowed_origins': "*",
            'async_mode': 'threading'  # Simple mode for development
        }
        
        # Only use Redis message queue if explicitly configured and available
        message_queue = app.config.get('SOCKETIO_MESSAGE_QUEUE')
        if message_queue and message_queue != 'redis://localhost:6379/2':
            # Only set if it's a real Redis instance, not localhost default
            socketio_config['message_queue'] = message_queue
        
        socketio.init_app(app, **socketio_config)
    except Exception as e:
        app.logger.warning(f'SocketIO initialization failed: {e}. Real-time features disabled.')
        # SocketIO is optional - app can work without it
    
    # Initialize rate limiter
    if app.config.get('RATELIMIT_ENABLED', True):
        limiter.storage_uri = app.config.get('RATELIMIT_STORAGE_URL', 'memory://')
        limiter.init_app(app)
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, db)
    
    # Initialize notification service
    from app.services import notification_service
    notification_service.init_app(app, socketio, mail)
    
    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models.auth import User
        return User.query.get(int(user_id))
    
    # Import and register blueprints
    from .routes.main import main
    from .routes.auth import auth
    from .routes.medication import medication
    from .routes.snooze import snooze
    from .routes.interaction import interaction
    from .routes.caregiver import caregiver
    from .routes.api import api_v1  # REST API
    
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(medication, url_prefix='/medication')
    app.register_blueprint(snooze, url_prefix='/snooze')
    app.register_blueprint(interaction, url_prefix='/interaction')
    app.register_blueprint(caregiver, url_prefix='/caregiver')
    app.register_blueprint(api_v1)  # API already has /api/v1 prefix
    
    # Import all models to register with SQLAlchemy
    from .models.auth import User
    from .models.medication import Medication
    from .models.relationship import CaregiverSenior
    from .models.medication_log import MedicationLog
    from .models.medication_interaction import MedicationInteraction, InteractionCheckResult
    from .models.snooze_log import SnoozeLog
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request_error(error):
        return render_template('errors/404.html', message="Bad Request"), 400
    
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(403)
    def forbidden_error(error):
        return render_template('errors/403.html'), 403
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Internal server error: {error}')
        return render_template('errors/500.html'), 500
    
    # Initialize scheduler if enabled
    if app.config.get('SCHEDULER_ENABLED', True):
        from app.utils.scheduler_init import init_scheduler
        init_scheduler(app)
    
    # CLI commands for database management
    @app.cli.command()
    def init_db():
        """Initialize the database."""
        db.create_all()
        print('Database initialized.')
    
    @app.cli.command()
    def seed_db():
        """Seed the database with sample data."""
        from app.models.auth import User
        
        # Create sample users if they don't exist
        if not User.query.filter_by(username='testsenior').first():
            senior = User(username='testsenior', email='senior@example.com', role='senior')
            senior.set_password('password123')
            db.session.add(senior)
        
        if not User.query.filter_by(username='testcaregiver').first():
            caregiver = User(username='testcaregiver', email='caregiver@example.com', role='caregiver')
            caregiver.set_password('password123')
            db.session.add(caregiver)
        
        db.session.commit()
        print('Database seeded.')
    
    return app
