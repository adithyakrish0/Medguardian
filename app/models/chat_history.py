"""Chat History model - stores conversation sessions"""
from app.extensions import db
from app.models.base import BaseModel


class ChatHistory(BaseModel):
    __tablename__ = 'chat_history'

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    session_id = db.Column(db.String(36), nullable=False, unique=True, index=True)
    title = db.Column(db.String(60), nullable=False, default='New Chat')
    messages = db.Column(db.JSON, nullable=False, default=list)

    def to_summary(self):
        """Lightweight dict for the sidebar list (no messages body)."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'title': self.title,
            'message_count': len(self.messages) if self.messages else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
