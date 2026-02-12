# app/routes/export.py
from flask import Blueprint, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.models.auth import User
from app.utils.export import export_to_pdf, export_to_csv, export_fleet_to_pdf

export_bp = Blueprint('export', __name__)

@export_bp.route('/pdf-report')
@login_required
def pdf_report():
    """Generate PDF report of medication history"""
    user_id = current_user.id
    
    # Get medication logs
    logs = MedicationLog.query.filter_by(user_id=user_id)\
        .order_by(MedicationLog.taken_at.desc())\
        .limit(100).all()
    
    medications = Medication.query.filter_by(user_id=user_id).all()
    
    if not logs:
        flash('No medication history to export.', 'warning')
        return redirect(url_for('analytics.dashboard'))
    
    return export_to_pdf(logs, medications, current_user)

@export_bp.route('/csv-report')
@login_required
def csv_report():
    """Generate CSV report of medication history"""
    user_id = current_user.id
    
    logs = MedicationLog.query.filter_by(user_id=user_id)\
        .order_by(MedicationLog.taken_at.desc())\
        .limit(500).all()
    
    medications = Medication.query.filter_by(user_id=user_id).all()
    
    if not logs:
        flash('No medication history to export.', 'warning')
        return redirect(url_for('analytics.dashboard'))
    
    return export_to_csv(logs, medications)

@export_bp.route('/senior/<int:senior_id>/pdf')
@login_required
def senior_pdf_report(senior_id):
    """Caregiver exporting specific senior's report"""
    # Security check: verify relationship
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id,
        status='accepted'
    ).first()
    
    if not relationship and current_user.id != senior_id:
        flash('Access denied.', 'error')
        return redirect(url_for('main.index'))
        
    senior = User.query.get_or_404(senior_id)
    logs = MedicationLog.query.filter_by(user_id=senior_id)\
        .order_by(MedicationLog.taken_at.desc())\
        .limit(100).all()
        
    medications = Medication.query.filter_by(user_id=senior_id).all()
    
    # Audit log
    from app.services.audit_service import audit_service
    audit_service.log_action(
        user_id=current_user.id,
        action='export_senior_pdf',
        target_id=senior_id,
        details=f"Caregiver exported PDF report for senior ID {senior_id}"
    )
    
    return export_to_pdf(logs, medications, senior)

@export_bp.route('/fleet/pdf')
@login_required
def fleet_pdf_report():
    """Export summary report for the entire managed fleet"""
    if current_user.role != 'caregiver':
        flash('Access denied.', 'error')
        return redirect(url_for('main.index'))
        
    # Get all accepted seniors
    relationships = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        status='accepted'
    ).all()
    
    fleet_data = []
    for rel in relationships:
        senior = rel.senior
        logs = MedicationLog.query.filter_by(user_id= senior.id).all()
        meds = Medication.query.filter_by(user_id=senior.id).all()
        fleet_data.append({
            'senior': senior,
            'logs': logs,
            'medications': meds
        })
        
    if not fleet_data:
        flash('No seniors in fleet to export.', 'warning')
        return redirect(url_for('caregiver.dashboard'))
        
    # Audit log
    from app.services.audit_service import audit_service
    audit_service.log_action(
        user_id=current_user.id,
        action='export_fleet_pdf',
        details=f"Caregiver exported fleet-wide PDF report"
    )
    
    return export_fleet_to_pdf(fleet_data, current_user)
