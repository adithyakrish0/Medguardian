from app.extensions import db

class Medication(db.Model):
    __tablename__ = 'medication'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50), nullable=False)
    frequency = db.Column(db.String(50), nullable=False)
    instructions = db.Column(db.Text)

    # Relationship to user (senior)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Medication times
    morning = db.Column(db.Boolean, default=False)
    afternoon = db.Column(db.Boolean, default=False)
    evening = db.Column(db.Boolean, default=False)
    night = db.Column(db.Boolean, default=False)

    # Reminder settings
    reminder_enabled = db.Column(db.Boolean, default=True)
    reminder_sound = db.Column(db.Boolean, default=True)
    reminder_voice = db.Column(db.Boolean, default=True)

    # Custom reminder times (stored as JSON string, e.g. '["08:00", "14:00"]')
    custom_reminder_times = db.Column(db.String(200))

    # Medication validity period
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    priority = db.Column(db.String(20), default='normal')
    custom_times = db.Column(db.String(200))  # JSON string for custom times

    def __repr__(self):
        return f'<Medication {self.name} for User {self.user_id}>'
