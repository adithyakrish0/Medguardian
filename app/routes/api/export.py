"""API v1 — Export endpoints (PDF / CSV)

Delegates to the existing export utilities in app/utils/export.py.
These routes serve file downloads consumable by the Next.js frontend
via fetch → blob → download pattern.
"""

from flask import jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from . import api_v1
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.relationship import CaregiverSenior
from app.models.auth import User
from app.utils.export import export_to_pdf, export_to_csv
import logging

logger = logging.getLogger(__name__)


def _fetch_user_data(user_id: int, days: int = 30):
    """Helper: fetch medications and recent logs for a user."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    medications = Medication.query.filter_by(user_id=user_id).all()

    logs = (
        MedicationLog.query
        .filter(
            MedicationLog.user_id == user_id,
            MedicationLog.taken_at >= cutoff
        )
        .order_by(MedicationLog.taken_at.desc())
        .all()
    )

    return medications, logs


# ── Own data endpoints ────────────────────────────────────────────────────────

@api_v1.route('/export/medications/pdf', methods=['GET'])
@login_required
def export_medications_pdf():
    """Download the current user's medication report as PDF."""
    try:
        medications, logs = _fetch_user_data(current_user.id)

        if not logs:
            return jsonify({'success': False, 'error': 'No medication history to export'}), 404

        # Audit
        try:
            from app.services.audit_service import audit_service
            audit_service.log_action(
                user_id=current_user.id,
                action='DATA_EXPORT_PDF',
                details='User exported personal PDF report via API'
            )
        except Exception:
            pass

        return export_to_pdf(logs, medications, current_user)

    except Exception as e:
        logger.error(f"PDF export failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@api_v1.route('/export/medications/csv', methods=['GET'])
@login_required
def export_medications_csv():
    """Download the current user's adherence logs as CSV."""
    try:
        medications, logs = _fetch_user_data(current_user.id)

        if not logs:
            return jsonify({'success': False, 'error': 'No medication history to export'}), 404

        # Audit
        try:
            from app.services.audit_service import audit_service
            audit_service.log_action(
                user_id=current_user.id,
                action='DATA_EXPORT_CSV',
                details='User exported personal CSV report via API'
            )
        except Exception:
            pass

        return export_to_csv(logs, medications)

    except Exception as e:
        logger.error(f"CSV export failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Caregiver endpoints ──────────────────────────────────────────────────────

@api_v1.route('/export/senior/<int:senior_id>/pdf', methods=['GET'])
@login_required
def export_senior_pdf(senior_id: int):
    """Caregiver downloads a specific senior's report as PDF."""
    try:
        # Verify relationship
        relationship = CaregiverSenior.query.filter_by(
            caregiver_id=current_user.id,
            senior_id=senior_id,
            status='accepted'
        ).first()

        if not relationship and current_user.id != senior_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403

        senior = User.query.get_or_404(senior_id)
        medications, logs = _fetch_user_data(senior_id)

        if not logs:
            return jsonify({'success': False, 'error': 'No medication history to export'}), 404

        # Audit
        try:
            from app.services.audit_service import audit_service
            audit_service.log_action(
                user_id=current_user.id,
                action='EXPORT_SENIOR_PDF',
                target_id=senior_id,
                details=f'Caregiver exported PDF report for senior ID {senior_id}'
            )
        except Exception:
            pass

        return export_to_pdf(logs, medications, senior)

    except Exception as e:
        logger.error(f"Senior PDF export failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
