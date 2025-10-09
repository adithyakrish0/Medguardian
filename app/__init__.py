# app/__init__.py
from flask import Flask
from .extensions import db, login_manager
from flask_migrate import Migrate
import os
# Import MedicationReminder locally to avoid circular imports

DB_NAME = "medguardian.db"

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    
    # Database path -> instance folder
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, '..', 'instance', DB_NAME)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    migrate = Migrate(app, db)
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models.auth import User
        return User.query.get(int(user_id))
    
    # Import routes
    from .routes.main import main
    from .routes.auth import auth
    from .routes.medication import medication
    
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(medication, url_prefix='/medication')
    
    # Import all models so SQLAlchemy registers them
    from .models.auth import User
    from .models.medication import Medication
    # Later you can add: from .models.schedule import Schedule, etc.
    
    # Initialize medication reminder system
    from app.utils.reminders import MedicationAlarmSystem
    reminder_system = MedicationAlarmSystem(app)
    
    # ❌ No db.create_all() here, use Flask-Migrate instead
    return app
