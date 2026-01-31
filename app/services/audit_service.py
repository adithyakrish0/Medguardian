"""Audit Service - Centralized logging for clinical and security actions"""
from flask import request
from app.extensions import db
from app.models.security_audit import SecurityAudit
from typing import Optional

class AuditService:
    @staticmethod
    def log_action(user_id: int, action: str, target_id: Optional[int] = None, details: Optional[str] = None):
        """Log a security or clinical action to the immutable audit database"""
        try:
            # Capture request context if available
            ip_address = request.remote_addr if request else "0.0.0.0"
            user_agent = request.user_agent.string if request else "System"
            
            log = SecurityAudit(
                user_id=user_id,
                action=action,
                target_id=target_id,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            db.session.add(log)
            db.session.commit()
            return True
        except Exception as e:
            print(f"FAILED TO WRITE AUDIT LOG: {e}")
            db.session.rollback()
            return False

    @staticmethod
    def get_logs_for_user(user_id: int, limit: int = 100):
        """Get audit logs involving a specific user (as performer or target)"""
        return SecurityAudit.query.filter(
            (SecurityAudit.user_id == user_id) | (SecurityAudit.target_id == user_id)
        ).order_by(SecurityAudit.created_at.desc()).limit(limit).all()

audit_service = AuditService()
