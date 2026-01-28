# app/__init__.py
from flask import Flask, render_template, request, jsonify
from .extensions import db, login_manager, socketio
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "400 per hour"]
)
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
    
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        raise ValueError("No SQLALCHEMY_DATABASE_URI configured. Please set DATABASE_URL in .env.")
    
    # Initialize configuration
    config_class.init_app(app)
    
    # Initialize Flask extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    
    # Exempt API from CSRF protection
    from app.routes.api import api_v1
    csrf.exempt(api_v1)
    
    mail.init_app(app)
    CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
    
    # Initialize SocketIO with proper configuration
    # Production: Uses eventlet async mode with Redis for horizontal scaling
    # Development: Uses threading mode (no Redis required)
    try:
        socketio_config = {
            'cors_allowed_origins': "*",
            'logger': True,
            'engineio_logger': False,
            'async_mode': 'eventlet',  # Required for Gunicorn eventlet workers
        }
        
        # Enable Redis message queue for production horizontal scaling
        # This allows broadcasting events across multiple container instances
        message_queue = app.config.get('SOCKETIO_MESSAGE_QUEUE')
        if message_queue and message_queue.startswith('redis://'):
            socketio_config['message_queue'] = message_queue
            app.logger.info(f'SocketIO will use Redis message queue: {message_queue}')
        
        socketio.init_app(app, **socketio_config)
        app.logger.info('SocketIO initialized successfully (eventlet mode)')
        
        # Register SocketIO event handlers for real-time detection
        from app import socket_events
        socket_events.register_handlers(socketio)
        app.logger.info('SocketIO event handlers registered')
        
        # Register camera sharing events
        from app.services.camera_share import register_camera_events
        register_camera_events(socketio)
        app.logger.info('Camera sharing events registered')
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
    from .routes.analytics import analytics
    from .routes.emergency import emergency
    from .routes.export import export_bp
    from .routes.contacts import contacts
    from .routes.telegram import telegram
    from .routes.prescription import prescription
    from .routes.insights import insights
    from .routes.print_schedule import print_schedule
    from .routes.api import api_v1  # REST API
    from .routes.health import health  # Health check
    from .routes.safety import safety  # Safety monitoring
    
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(medication, url_prefix='/medication')
    app.register_blueprint(snooze, url_prefix='/snooze')
    app.register_blueprint(interaction, url_prefix='/interaction')
    app.register_blueprint(caregiver, url_prefix='/caregiver')
    app.register_blueprint(analytics, url_prefix='/analytics')
    app.register_blueprint(emergency, url_prefix='/emergency')
    app.register_blueprint(export_bp, url_prefix='/export')
    app.register_blueprint(contacts, url_prefix='/contacts')
    app.register_blueprint(telegram, url_prefix='/telegram')
    app.register_blueprint(prescription, url_prefix='/prescription')
    app.register_blueprint(insights, url_prefix='/insights')
    app.register_blueprint(print_schedule, url_prefix='/print')
    app.register_blueprint(api_v1)  # API already has /api/v1 prefix
    # Only register debug routes in development mode
    if app.config.get('DEBUG', False):
        from .routes.debug import debug_bp
        app.register_blueprint(debug_bp)
        app.logger.info('Debug routes enabled (development mode)')
    app.register_blueprint(health)  # Health check endpoints
    app.register_blueprint(safety)  # Safety monitoring (fall detection, etc.)
    
    # Import all models to register with SQLAlchemy
    from .models.auth import User
    from .models.medication import Medication
    from .models.relationship import CaregiverSenior
    from .models.medication_log import MedicationLog
    from .models.medication_interaction import MedicationInteraction, InteractionCheckResult
    from .models.snooze_log import SnoozeLog
    
    @app.before_request
    def log_request_info():
        if request.path.startswith('/api/'):
            app.logger.info(f'API Request: {request.method} {request.path}')
            app.logger.debug(f'Headers: {dict(request.headers)}')
            app.logger.debug(f'Body: {request.get_data(as_text=True)[:500]}')
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Bad Request', 'error': str(error)}), 400
        return render_template('errors/404.html', message="Bad Request"), 400
    
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Not Found'}), 404
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(403)
    def forbidden_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Forbidden', 'error': 'CSRF or permission denied'}), 403
        return render_template('errors/403.html'), 403
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Internal server error: {error}')
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'Internal Server Error', 'error': str(error)}), 500
        return render_template('errors/500.html'), 500
    
    from flask_wtf.csrf import CSRFError
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'message': 'CSRF error', 'reason': e.description}), 400
        return render_template('errors/400.html', message="CSRF Error"), 400
    
    # Initialize scheduler if enabled
    if app.config.get('SCHEDULER_ENABLED', True):
        from app.utils.scheduler_init import init_scheduler
        init_scheduler(app)
    
    # Start Telegram polling for local development (webhook doesn't work on localhost)
    try:
        from app.services.telegram_service import start_telegram_polling
        start_telegram_polling(app)
    except Exception as e:
        app.logger.warning(f'Telegram polling disabled: {e}')
    
    # CLI commands for database management
    @app.cli.command()
    def init_db():
        """Initialize the database."""
        db.create_all()
        print('Database initialized.')
    
    @app.cli.command()
    def seed_db():
        """Seed the database with sample data (DEVELOPMENT ONLY)."""
        import secrets
        from app.models.auth import User
        
        # Only allow seeding in development mode
        if not app.config.get('DEBUG', False):
            print('ERROR: seed_db is disabled in production mode.')
            return
        
        # Generate secure random passwords for demo accounts
        demo_password = secrets.token_urlsafe(16)
        
        # Create sample users if they don't exist
        if not User.query.filter_by(username='testsenior').first():
            senior = User(username='testsenior', email='senior@example.com', role='senior')
            senior.set_password(demo_password)
            db.session.add(senior)
        
        if not User.query.filter_by(username='testcaregiver').first():
            caregiver = User(username='testcaregiver', email='caregiver@example.com', role='caregiver')
            caregiver.set_password(demo_password)
            db.session.add(caregiver)
        
        db.session.commit()
        print(f'Database seeded. Demo password: {demo_password}')
        print('(Save this password - it will not be shown again)')
    
    return app
