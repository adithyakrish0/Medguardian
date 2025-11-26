from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.relationship import CaregiverSenior
from app.models.medication_log import MedicationLog
from datetime import datetime, timedelta

caregiver = Blueprint('caregiver', __name__)

@caregiver.route('/dashboard')
@login_required
def dashboard():
    """Caregiver dashboard showing all assigned seniors"""
    if current_user.role != 'caregiver':
        flash('Access denied. Caregiver access required.', 'danger')
        return redirect(url_for('main.index'))
    
    # Get all seniors assigned to this caregiver
    relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id).all()
    seniors = [rel.senior for rel in relationships]
    
    # Calculate statistics
    senior_stats = []
    for senior in seniors:
        medications = Medication.query.filter_by(user_id=senior.id).all()
        
        # Get today's logs
        today = datetime.now().date()
        today_logs = MedicationLog.query.filter(
            MedicationLog.user_id == senior.id,
            db.func.date(MedicationLog.taken_at) == today
        ).all()
        
        # Calculate compliance
        total_logs = MedicationLog.query.filter_by(user_id=senior.id).limit(30).all()
        taken_count = sum(1 for log in total_logs if log.taken_correctly)
        compliance_rate = int((taken_count / len(total_logs) * 100)) if total_logs else 0
        
        senior_stats.append({
            'senior': senior,
            'medication_count': len(medications),
            'taken_today': len([log for log in today_logs if log.taken_correctly]),
            'total_today': len(medications),
            'compliance_rate': compliance_rate,
            'last_active': max([log.taken_at for log in today_logs]) if today_logs else None
        })
    
    return render_template('caregiver/dashboard.html', 
                         senior_stats=senior_stats,
                         total_seniors=len(seniors))

@caregiver.route('/senior/<int:senior_id>')
@login_required
def senior_detail(senior_id):
    """View detailed information about a specific senior"""
    if current_user.role != 'caregiver':
        flash('Access denied.', 'danger')
        return redirect(url_for('main.index'))
    
    # Verify this senior is assigned to this caregiver
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id
    ).first_or_404()
    
    senior = relationship.senior
    medications = Medication.query.filter_by(user_id=senior_id).all()
    
    # Get recent logs
    recent_logs = MedicationLog.query.filter_by(
        user_id=senior_id
    ).order_by(MedicationLog.taken_at.desc()).limit(20).all()
    
    return render_template('caregiver/senior_detail.html',
                         senior=senior,
                         medications=medications,
                         recent_logs=recent_logs,
                         relationship=relationship)
