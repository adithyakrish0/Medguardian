# app/routes/export.py
from flask import Blueprint, redirect, url_for, flash
from flask_login import login_required, current_user
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.utils.export import export_to_pdf, export_to_csv

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
