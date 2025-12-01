# app/__init__.py
from flask import Flask, render_template
from .extensions import db, login_manager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_NAME = "medguardian.db"

# Initialize CSRF protection
csrf = CSRFProtect()

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.getenv('RATELIMIT_STORAGE_URL', 'memory://')
)

def create_app(config_name=None):
    app = Flask(__name__)
    
    # Load configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    from config import config
    app.config.from_object(config[config_name])
    
    # Override with environment variables
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', app.config.get('SECRET_KEY'))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', app.config.get('SQLALCHEMY_DATABASE_URI'))
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    
    # Exempt specific API endpoints from CSRF (AJAX endpoints with login_required)
    csrf.exempt('app.routes.medication.mark_taken')
    csrf.exempt('app.routes.snooze.create_snooze')
    
    if os.getenv('RATELIMIT_ENABLED', 'True') == 'True':
        limiter.init_app(app)
    migrate = Migrate(app, db)
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models.auth import User
        return User.query.get(int(user_id))
    
    # Import routes
    from .routes.main import main
    from .routes.auth import auth
    from .routes.medication import medication
    from .routes.snooze import snooze
    from .routes.interaction import interaction
    from .routes.caregiver import caregiver
    
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(medication, url_prefix='/medication')
    app.register_blueprint(snooze, url_prefix='/snooze')
    app.register_blueprint(interaction, url_prefix='/interaction')
    app.register_blueprint(caregiver, url_prefix='/caregiver')
    
    # Import all models so SQLAlchemy registers them
    from .models.auth import User
    from .models.medication import Medication
    from .models.relationship import CaregiverSenior
    from .models.medication_log import MedicationLog
    from .models.medication_interaction import MedicationInteraction, InteractionCheckResult
    from .models.snooze_log import SnoozeLog
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('errors/500.html'), 500
    
    @app.errorhandler(403)
    def forbidden_error(error):
        return render_template('errors/403.html'), 403
    
    # Initialize scheduler if enabled
    if os.getenv('SCHEDULER_ENABLED', 'True') == 'True':
        from app.utils.scheduler_init import init_scheduler
        init_scheduler(app)
    
    # Initialize email service
    from app.utils.email_service import init_mail
    init_mail(app)
    
    return app
