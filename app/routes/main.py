# app/routes/main.py
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.extensions import db

# Import User inside functions to avoid circular imports
def get_user_model():
    from app.models.auth import User
    return User

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'senior':
        # Get medication data for dashboard
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        from datetime import datetime, date
        
        # Create app context for database operations
        from app import create_app
        app = create_app()
        
        with app.app_context():
            # Get all medications for the user
            medications = Medication.query.filter_by(user_id=current_user.id).all()
            
            # Get today's logs
            today = date.today()
            today_logs = MedicationLog.query.filter_by(
                user_id=current_user.id,
                taken_at=today
            ).all()
            
            # Calculate statistics
            upcoming_count = len([m for m in medications if any([m.morning, m.afternoon, m.evening, m.night])])
            today_count = len(medications)
            
            # Calculate compliance
            total_logs = MedicationLog.query.filter_by(user_id=current_user.id).all()
            taken_logs = [log for log in total_logs if log.taken_correctly]
            compliance_rate = int((len(taken_logs) / len(total_logs) * 100)) if total_logs else 0
            
            # Get today's medications with status
            today_medications = []
            for med in medications:
                taken = any(log.medication_id == med.id and log.taken_at.date() == today and log.taken_correctly 
                           for log in today_logs)
                today_medications.append({
                    'id': med.id,
                    'name': med.name,
                    'dosage': med.dosage,
                    'frequency': med.frequency,
                    'taken': taken
                })
            
            # Get upcoming medications
            now = datetime.now()
            upcoming_medications = []
            for med in medications:
                if med.morning and now.hour < 9:
                    upcoming_medications.append({'name': med.name, 'time': 'Morning (7-9 AM)'})
                elif med.afternoon and 9 <= now.hour < 15:
                    upcoming_medications.append({'name': med.name, 'time': 'Afternoon (12-2 PM)'})
                elif med.evening and 15 <= now.hour < 21:
                    upcoming_medications.append({'name': med.name, 'time': 'Evening (6-8 PM)'})
                elif med.night and now.hour >= 21:
                    upcoming_medications.append({'name': med.name, 'time': 'Night (9-12 AM)'})
            
            # Count taken and missed
            taken_count = len([log for log in total_logs if log.taken_correctly])
            missed_count = len([log for log in total_logs if not log.taken_correctly])
            
            return render_template('senior/dashboard.html',
                                 upcoming_count=upcoming_count,
                                 today_count=today_count,
                                 compliance_rate=compliance_rate,
                                 today_medications=today_medications,
                                 upcoming_medications=upcoming_medications,
                                 taken_count=taken_count,
                                 missed_count=missed_count)
    else:  # caregiver
        # Get seniors managed by this caregiver
        from app.models.relationship import CaregiverSenior
        
        # Create app context for database operations
        from app import create_app
        app = create_app()
        
        with app.app_context():
            relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
            seniors = [rel.senior for rel in relationships]
            
            # Calculate stats
            active_today = len(seniors)  # Placeholder - can be enhanced
            pending_medications = 0      # Placeholder - can be enhanced
            missed_doses = 0             # Placeholder - can be enhanced
            
            return render_template('caregiver/dashboard.html', 
                                 seniors=seniors,
                                 active_today=active_today,
                                 pending_medications=pending_medications,
                                 missed_doses=missed_doses)

@main.route('/caregiver/seniors')
@login_required
def caregiver_seniors():
    """Show all seniors managed by this caregiver"""
    if current_user.role != 'caregiver':
        return redirect(url_for('main.index'))
    
    # Create app context for database operations
    from app import create_app
    from app.models.relationship import CaregiverSenior
    
    app = create_app()
    
    with app.app_context():
        relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
        seniors = [rel.senior for rel in relationships]
        
        return render_template('caregiver/seniors.html', seniors=seniors)

@main.route('/caregiver/add-senior', methods=['GET', 'POST'])
@login_required
def add_senior():
    """Add a senior to caregiver's dashboard"""
    if current_user.role != 'caregiver':
        return redirect(url_for('main.index'))
    
    # Create app context for database operations
    from app import create_app
    from app.models.relationship import CaregiverSenior
    from app.models.auth import User
    
    app = create_app()
    
    with app.app_context():
        if request.method == 'POST':
            senior_username = request.form.get('senior_username')
            relationship_type = request.form.get('relationship_type', 'primary')
            notes = request.form.get('notes', '')
            
            # Find the senior user
            senior = User.query.filter_by(username=senior_username).first()
            
            if not senior:
                flash('Senior not found. Please check the username and try again.')
                return redirect(url_for('main.add_senior'))
            
            if senior.role != 'senior':
                flash('User is not a senior citizen.')
                return redirect(url_for('main.add_senior'))
            
            # Check if already added
            existing_relationship = CaregiverSenior.query.filter_by(
                caregiver_id=current_user.id,
                senior_id=senior.id
            ).first()
            
            if existing_relationship:
                flash('This senior is already in your dashboard.')
                return redirect(url_for('main.add_senior'))
            
            # Create new relationship
            relationship = CaregiverSenior(
                caregiver_id=current_user.id,
                senior_id=senior.id,
                relationship_type=relationship_type,
                notes=notes
            )
            
            db.session.add(relationship)
            db.session.commit()
            
            flash(f'Senior {senior.username} added successfully!')
            return redirect(url_for('main.caregiver_seniors'))
        
        # Get all available seniors (not already assigned)
        all_seniors = User.query.filter_by(role='senior').all()
        assigned_seniors = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
        assigned_ids = [rel.senior_id for rel in assigned_seniors]
        available_seniors = [senior for senior in all_seniors if senior.id not in assigned_ids]
        
        return render_template('caregiver/add_senior.html', available_seniors=available_seniors)

@main.route('/caregiver/remove-senior/<int:senior_id>', methods=['POST'])
@login_required
def remove_senior(senior_id):
    """Remove a senior from caregiver's dashboard"""
    if current_user.role != 'caregiver':
        return redirect(url_for('main.index'))
    
    # Create app context for database operations
    from app import create_app
    from app.models.relationship import CaregiverSenior
    
    app = create_app()
    
    with app.app_context():
        relationship = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=senior_id
        ).first()
        
        if relationship:
            db.session.delete(relationship)
            db.session.commit()
            flash('Senior removed from your dashboard.')
        else:
            flash('Senior not found in your dashboard.')
        
        return redirect(url_for('main.caregiver_seniors'))

@main.route('/add-user', methods=['POST'])
def add_user():
    User = get_user_model()
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password', 'defaultpassword')  # Use default password if not provided
    
    new_user = User(username=username, email=email, role='senior')
    new_user.set_password(password)  # Set password
    
    db.session.add(new_user)
    db.session.commit()
    
    return redirect(url_for('main.index'))
