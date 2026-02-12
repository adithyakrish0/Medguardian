# app/routes/analytics.py
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from datetime import datetime, timedelta
import json

analytics = Blueprint('analytics', __name__)

@analytics.route('/')
@login_required
def dashboard():
    """Analytics dashboard with charts and statistics"""
    return render_template('analytics/dashboard.html')

@analytics.route('/api/compliance')
@login_required
def get_compliance():
    """Get weekly compliance data for charts"""
    user_id = current_user.id
    if current_user.role == 'caregiver':
        # Get first senior for demo
        from app.models.relationship import CaregiverSenior
        rel = CaregiverSenior.query.filter_by(caregiver_id=user_id).first()
        if rel:
            user_id = rel.senior_id
    
    # Get last 7 days of data
    today = datetime.now().date()
    labels = []
    taken_data = []
    missed_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        labels.append(day.strftime('%a'))
        
        day_logs = MedicationLog.query.filter(
            MedicationLog.user_id == user_id,
            db.func.date(MedicationLog.taken_at) == day
        ).all()
        
        taken = sum(1 for log in day_logs if log.taken_correctly)
        missed = sum(1 for log in day_logs if not log.taken_correctly)
        
        taken_data.append(taken)
        missed_data.append(missed)
    
    return jsonify({
        'labels': labels,
        'taken': taken_data,
        'missed': missed_data
    })

@analytics.route('/api/distribution')
@login_required
def get_distribution():
    """Get medication time distribution"""
    user_id = current_user.id
    if current_user.role == 'caregiver':
        from app.models.relationship import CaregiverSenior
        rel = CaregiverSenior.query.filter_by(caregiver_id=user_id).first()
        if rel:
            user_id = rel.senior_id
    
    medications = Medication.query.filter_by(user_id=user_id).all()
    
    distribution = {
        'Morning': 0,
        'Afternoon': 0,
        'Evening': 0,
        'Night': 0,
        'Custom': 0
    }
    
    for med in medications:
        if med.morning:
            distribution['Morning'] += 1
        if med.afternoon:
            distribution['Afternoon'] += 1
        if med.evening:
            distribution['Evening'] += 1
        if med.night:
            distribution['Night'] += 1
        if med.custom_reminder_times:
            try:
                custom = json.loads(med.custom_reminder_times)
                distribution['Custom'] += len(custom)
            except:
                pass
    
    return jsonify({
        'labels': list(distribution.keys()),
        'data': list(distribution.values())
    })

@analytics.route('/api/summary')
@login_required
def get_summary():
    """Get summary statistics"""
    user_id = current_user.id
    if current_user.role == 'caregiver':
        from app.models.relationship import CaregiverSenior
        rel = CaregiverSenior.query.filter_by(caregiver_id=user_id).first()
        if rel:
            user_id = rel.senior_id
    
    medications = Medication.query.filter_by(user_id=user_id).all()
    all_logs = MedicationLog.query.filter_by(user_id=user_id).all()
    
    today = datetime.now().date()
    today_logs = [log for log in all_logs if log.taken_at.date() == today]
    
    # 30-day stats
    thirty_days_ago = today - timedelta(days=30)
    month_logs = [log for log in all_logs if log.taken_at.date() >= thirty_days_ago]
    month_taken = sum(1 for log in month_logs if log.taken_correctly)
    month_total = len(month_logs)
    
    # Streak calculation
    streak = 0
    check_date = today
    while True:
        day_logs = [log for log in all_logs if log.taken_at.date() == check_date]
        if day_logs and all(log.taken_correctly for log in day_logs):
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    return jsonify({
        'total_medications': len(medications),
        'taken_today': sum(1 for log in today_logs if log.taken_correctly),
        'pending_today': len(medications) - sum(1 for log in today_logs if log.taken_correctly),
        'compliance_rate': int((month_taken / month_total * 100)) if month_total > 0 else 0,
        'current_streak': streak,
        'total_doses_month': month_total
    })

@analytics.route('/api/trends')
@login_required
def get_trends():
    """Get monthly compliance trends"""
    user_id = current_user.id
    if current_user.role == 'caregiver':
        from app.models.relationship import CaregiverSenior
        rel = CaregiverSenior.query.filter_by(caregiver_id=user_id).first()
        if rel:
            user_id = rel.senior_id
    
    today = datetime.now().date()
    labels = []
    compliance_data = []
    
    # Last 4 weeks
    for i in range(3, -1, -1):
        week_start = today - timedelta(days=7 * (i + 1))
        week_end = today - timedelta(days=7 * i)
        labels.append(f'Week {4-i}')
        
        week_logs = MedicationLog.query.filter(
            MedicationLog.user_id == user_id,
            db.func.date(MedicationLog.taken_at) >= week_start,
            db.func.date(MedicationLog.taken_at) < week_end
        ).all()
        
        if week_logs:
            taken = sum(1 for log in week_logs if log.taken_correctly)
            compliance_data.append(int(taken / len(week_logs) * 100))
        else:
            compliance_data.append(0)
    

# ... (existing imports)
from app.services.pk_service import PKService

@analytics.route('/api/bio-twin')
@login_required
def get_bio_twin():
    """Get Pharmacokinetic Simulation Data (Bio-Twin)"""
    user_id = current_user.id
    if current_user.role == 'caregiver':
        from app.models.relationship import CaregiverSenior
        rel = CaregiverSenior.query.filter_by(caregiver_id=user_id).first()
        if rel:
            user_id = rel.senior_id
            
    # Real-time calculation - get per-medication results
    med_results = PKService.calculate_current_concentration(user_id)
    forecast = PKService.generate_24h_forecast(user_id)
    
    # Aggregate current_status for the frontend
    if med_results:
        total_cp = sum(r.get('concentration_mg_l', 0) for r in med_results)
        # Determine overall status based on aggregate
        if total_cp < 5:
            status = 'Sub-therapeutic'
        elif total_cp > 20:
            status = 'Toxicity Risk'
        elif total_cp > 15:
            status = 'High'
        else:
            status = 'Therapeutic'
        
        current_status = {
            'current_cp': round(total_cp, 2),
            'plasma_concentration': round(total_cp, 2),
            'status': status,
            'last_dose': 'Recent',
            'medications': med_results  # Include detailed per-med data
        }
    else:
        current_status = {
            'current_cp': 0,
            'plasma_concentration': 0,
            'status': 'No Data',
            'last_dose': 'N/A'
        }
    
    return jsonify({
        'current_status': current_status,
        'forecast': forecast
    })
