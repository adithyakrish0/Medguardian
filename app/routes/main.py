# app/routes/main.py
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.extensions import db
from datetime import datetime, date, timedelta
import json

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
        from app.models.snooze_log import SnoozeLog
        
        # Get all medications for the user
        medications = Medication.query.filter_by(user_id=current_user.id).all()
            
        # Get today's logs
        today = date.today()
        today_logs = MedicationLog.query.filter_by(
            user_id=current_user.id,
            taken_at=today
        ).all()
            
        # Check for active snooze
        now = datetime.utcnow()
        active_snooze = SnoozeLog.query.filter(
            SnoozeLog.user_id == current_user.id,
            SnoozeLog.snooze_until > now
        ).order_by(SnoozeLog.created_at.desc()).first()
            
        # Calculate statistics
        upcoming_count = len([m for m in medications if any([m.morning, m.afternoon, m.evening, m.night, m.custom_reminder_times])])
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
                
            # Parse scheduled times for display
            scheduled_times = []
            if med.custom_reminder_times:
                try:
                    custom_times = json.loads(med.custom_reminder_times)
                    scheduled_times.extend([{'time': t, 'period': 'Custom', 'is_custom': True} for t in custom_times])
                except:
                    pass
                
            # Add period-based times (clean display without redundant ranges)
            periods = []
            if med.morning: periods.append('Morning')
            if med.afternoon: periods.append('Afternoon')
            if med.evening: periods.append('Evening')
            if med.night: periods.append('Night')
                
            for period in periods:
                scheduled_times.append({
                    'time': period,
                    'period': period,
                    'is_custom': False,
                    'time_range': get_period_time_range(period)  # For tooltip
                })
                
            today_medications.append({
                'id': med.id,
                'name': med.name,
                'dosage': med.dosage,
                'frequency': med.frequency,
                'instructions': med.instructions,
                'taken': taken,
                'is_available': True,  # Can be enhanced later
                'scheduled_times': scheduled_times if scheduled_times else [{'time': 'Not scheduled', 'period': 'None', 'is_custom': False}]
            })
            
        # Get upcoming medications with proper timing
        now = datetime.now()
        upcoming_medications = []
            
        # If there's an active snooze, add it to upcoming
        if active_snooze:
            # Convert UTC snooze time to local time for correct display and sorting
            # active_snooze.snooze_until is stored in UTC
            utc_now = datetime.utcnow()
            local_now = datetime.now()
            time_diff = local_now - utc_now
            local_snooze_time = active_snooze.snooze_until + time_diff
            
            snooze_info = {
                'name': active_snooze.medication.name if active_snooze.medication else 'Medication',
                'dosage': active_snooze.medication.dosage if active_snooze.medication else 'Unknown dosage',
                'time': local_snooze_time,
                'period': 'Snooze',
                'is_custom': False,
                'is_snooze': True,
                'snooze_until': local_snooze_time.isoformat()
            }
            upcoming_medications.append(snooze_info)

        # ALWAYS collect next doses (no else block)
        all_doses = []
        for med in medications:
            next_dose = getNextMedicationTime(med, now)
            if next_dose:
                # Check if this dose has been taken
                # Get logs for this med today
                med_logs = [l for l in today_logs if l.medication_id == med.id]
                
                is_taken = False
                dose_time = next_dose['time']
                
                # Only check if dose is today (or past)
                if isinstance(dose_time, datetime) and dose_time.date() <= now.date():
                    for log in med_logs:
                        # If log is within -2 hours to +2 hours of dose time?
                        # This handles taking it early, or late.
                        # And ensures we don't match morning log to evening dose (unless they are < 2 hours apart)
                        margin = timedelta(hours=2)
                        # Ensure log.taken_at is aware/naive consistent with dose_time
                        # Usually both are naive local time in this app context
                        if (dose_time - margin) <= log.taken_at <= (dose_time + margin):
                            is_taken = True
                            break
                
                if not is_taken:
                    all_doses.append({
                        'id': med.id,
                        'name': med.name,
                        'dosage': med.dosage,
                        'time': next_dose['time'],
                        'period': next_dose['period'],
                        'is_custom': next_dose.get('is_custom', False)
                    })
            
        # Sort all doses by actual datetime and take the first 6
        all_doses.sort(key=lambda x: x['time'])
        
        # Add to upcoming_medications
        upcoming_medications.extend(all_doses[:6])
            
        # Format times for display after sorting
        for med in upcoming_medications:
            if isinstance(med['time'], datetime):
                med['time'] = format_time_for_display(med['time'])
            
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
                             missed_count=missed_count,
                             active_snooze=active_snooze.to_dict() if active_snooze else None,
                             current_medications=medications)  # Add current medications for interaction checker
    else:  # caregiver
        # Get seniors managed by this caregiver
        from app.models.relationship import CaregiverSenior
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        
        relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
        
        senior_stats = []
        active_today = 0
        pending_medications = 0
        missed_doses = 0
        
        today = date.today()
        
        for rel in relationships:
            senior = rel.senior
            meds = Medication.query.filter_by(user_id=senior.id).all()
            logs = MedicationLog.query.filter_by(user_id=senior.id).all()
            today_logs = [log for log in logs if log.taken_at.date() == today]
            
            # Calculate daily total doses
            daily_doses = 0
            for med in meds:
                # Count period-based doses
                if med.morning: daily_doses += 1
                if med.afternoon: daily_doses += 1
                if med.evening: daily_doses += 1
                if med.night: daily_doses += 1
                
                # Count custom times
                if med.custom_reminder_times:
                    try:
                        daily_doses += len(json.loads(med.custom_reminder_times))
                    except:
                        pass
            
            taken_today_count = len([l for l in today_logs if l.taken_correctly])
            
            # Calculate compliance
            total_taken = len([l for l in logs if l.taken_correctly])
            compliance = int((total_taken / len(logs) * 100)) if logs else 0
            
            # Last active
            last_log = MedicationLog.query.filter_by(user_id=senior.id).order_by(MedicationLog.taken_at.desc()).first()
            last_active = last_log.taken_at if last_log else None
            
            if taken_today_count > 0:
                active_today += 1
                
            pending = max(0, daily_doses - taken_today_count)
            pending_medications += pending
            
            senior_stats.append({
                'senior': senior,
                'medication_count': len(meds),
                'taken_today': taken_today_count,
                'total_today': daily_doses,
                'compliance_rate': compliance,
                'last_active': last_active
            })
            
        return render_template('caregiver/dashboard.html', 
                             senior_stats=senior_stats,
                             total_seniors=len(relationships))

def getNextMedicationTime(med, now):
    """Get the next medication time for a medication"""
    next_times = []
    
    # Allow a 15-minute grace period for "due now" medications
    # If a medication was due 5 minutes ago, we still want to show it as "today"
    # so the alert can trigger.
    grace_period = timedelta(minutes=15)
    
    def add_time(hour, minute, period, is_custom=False):
        time = datetime(now.year, now.month, now.day, hour, minute)
        # Only move to tomorrow if it's significantly in the past (beyond grace period)
        if time < (now - grace_period):
            time = datetime(now.year, now.month, now.day + 1, hour, minute)
        next_times.append({
            'time': time,
            'period': period,
            'is_custom': is_custom
        })
    
    # Check custom times first - these should take priority
    if med.custom_reminder_times:
        try:
            custom_times = json.loads(med.custom_reminder_times)
            for time_str in custom_times:
                time_parts = time_str.split(':')
                if len(time_parts) == 2:
                    hour = int(time_parts[0])
                    minute = int(time_parts[1])
                    # Convert 24-hour to 12-hour format for calculation, but store as 24-hour
                    time = datetime(now.year, now.month, now.day, hour, minute)
                    # Only move to tomorrow if it's significantly in the past
                    if time < (now - grace_period):
                        time = datetime(now.year, now.month, now.day + 1, hour, minute)
                    next_times.append({
                        'time': time,
                        'period': 'Custom',
                        'is_custom': True
                    })
        except Exception as e:
            print(f"Error parsing custom times for {med.name}: {e}")
    
    # Check scheduled periods only if no custom times or if they're for tomorrow
    current_hour = now.hour
    
    # Morning (8 AM)
    if med.morning:
        if current_hour < 8:
            add_time(8, 0, 'Morning')
        else:
            add_time(8, 0, 'Morning', True)  # Tomorrow
    
    # Afternoon (2 PM)
    if med.afternoon:
        if current_hour < 14:
            add_time(14, 0, 'Afternoon')
        else:
            add_time(14, 0, 'Afternoon', True)  # Tomorrow
    
    # Evening (6 PM)
    if med.evening:
        if current_hour < 18:
            add_time(18, 0, 'Evening')
        else:
            add_time(18, 0, 'Evening', True)  # Tomorrow
    
    # Night (9 PM)
    if med.night:
        if current_hour < 21:
            add_time(21, 0, 'Night')
        else:
            add_time(21, 0, 'Night', True)  # Tomorrow
    
    # Sort by time and return the very next one
    next_times.sort(key=lambda x: x['time'])
    print(f"Medication {med.name} - Next times: {next_times}")
    return next_times[0] if next_times else None

def format_time_for_display(time_obj):
    """Format datetime object for display"""
    return time_obj.strftime('%I:%M %p')

def get_period_time_range(period):
    """Get time range for display"""
    ranges = {
        'Morning': '7-9 AM',
        'Afternoon': '12-2 PM',
        'Evening': '6-8 PM',
        'Night': '9-12 AM'
    }
    return ranges.get(period, 'Unknown')

@main.route('/caregiver/seniors')
@login_required
def caregiver_seniors():
    """Show all seniors managed by this caregiver"""
    if current_user.role != 'caregiver':
        return redirect(url_for('main.index'))
    
    from app.models.relationship import CaregiverSenior
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    seniors = [rel.senior for rel in relationships]
        
    return render_template('caregiver/seniors.html', seniors=seniors)

@main.route('/caregiver/add-senior', methods=['GET', 'POST'])
@login_required
def add_senior():
    """Add a senior to caregiver's dashboard"""
    if current_user.role != 'caregiver':
        return redirect(url_for('main.index'))
    
    from app.models.relationship import CaregiverSenior
    from app.models.auth import User
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
    
    from app.models.relationship import CaregiverSenior
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
