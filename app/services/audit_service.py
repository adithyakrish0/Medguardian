from flask import request
from app.extensions import db
from app.models.security_audit import SecurityAudit
from flask_login import current_user

class AuditService:
    @staticmethod
    def log_event(action, target_id=None, details=None):
        """Log a security event to the database"""
        try:
            audit = SecurityAudit(
                user_id=current_user.id,
                action=action,
                target_id=target_id,
                details=details,
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string
            )
            db.session.add(audit)
            db.session.commit()
            return True
        except Exception as e:
            print(f"Failed to log audit event: {e}")
            db.session.rollback()
            return False

audit_service = AuditService()
