from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.auth import User
from app.extensions import db
from sqlalchemy import func

class AnalyticsService:
    @staticmethod
    def get_adherence_history(user_id, days=7):
        """Get adherence data for the last X days for a specific user"""
        today = datetime.now().date()
        now = datetime.now()
        days_data = []
        
        # Get active medications for this user
        user_meds = Medication.query.filter_by(user_id=user_id).all()
        
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            # ... calculation logic remains same ...
            start_of_day = datetime.combine(day, datetime.min.time())
            end_of_day = datetime.combine(day, datetime.max.time())
            is_today = (day == today)
            
            expected_doses = 0
            for med in user_meds:
                # Only check meds that were created on or before this day
                if med.created_at and med.created_at.date() > day:
                    continue

                reminder_times = med.get_reminder_times()
                for time_str in reminder_times:
                    try:
                        h, m = map(int, time_str.split(':'))
                        scheduled_dt = datetime.combine(day, datetime.min.time().replace(hour=h, minute=m))
                        if is_today:
                            if scheduled_dt + timedelta(minutes=30) <= now:
                                expected_doses += 1
                        else:
                            expected_doses += 1
                    except:
                        continue
            
            day_logs = MedicationLog.query.filter(
                MedicationLog.user_id == user_id,
                MedicationLog.taken_at >= start_of_day,
                MedicationLog.taken_at <= end_of_day
            ).all()
            
            taken = sum(1 for log in day_logs if log.taken_correctly)
            skipped = sum(1 for log in day_logs if not log.taken_correctly)
            
            if expected_doses == 0:
                adherence = 100
            else:
                adherence = int((taken / expected_doses) * 100)
            
            days_data.append({
                'date': day.strftime('%a'),
                'full_date': day.isoformat(),
                'adherence': min(adherence, 100),
                'taken': taken,
                'skipped': skipped,
                'expected': expected_doses
            })
            
        return days_data

    @staticmethod
    def get_7_day_adherence(user_id):
        return AnalyticsService.get_adherence_history(user_id, 7)

    @staticmethod
    def calculate_risk_score(senior_id):
        """
        Calculate a risk score (0-200+) for a senior based on recent behavior.
        Higher = higher risk.
        """
        score = 0
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        # 1. 7-Day Adherence Penalty
        stats = AnalyticsService.get_7_day_adherence(senior_id)
        avg_adherence = sum(d['adherence'] for d in stats) / len(stats) if stats else 100
        score += (100 - avg_adherence)
        
        # 2. Recent Misses Penalty
        today_stats = next((d for d in stats if d['full_date'] == today.isoformat()), None)
        yesterday_stats = next((d for d in stats if d['full_date'] == yesterday.isoformat()), None)
        
        if today_stats:
            score += (today_stats['skipped'] * 25)
        if yesterday_stats:
            score += (yesterday_stats['skipped'] * 15)
            
        # 3. High Priority Penalty
        # If any missed/skipped med was high priority in the last 48 hours
        start_48h = datetime.combine(yesterday, datetime.min.time())
        recent_skips = MedicationLog.query.filter(
            MedicationLog.user_id == senior_id,
            MedicationLog.taken_correctly == False,
            MedicationLog.taken_at >= start_48h
        ).all()
        
        for skip in recent_skips:
            if skip.medication and skip.medication.priority == 'high':
                score += 50
                break # Only penalty once for recent high priority skip
                
        return int(score)

    @staticmethod
    def get_fleet_analytics(caregiver_id):
        """Get analytics for all seniors in a caregiver's fleet"""
        from app.models.relationship import CaregiverSenior
        
        relationships = CaregiverSenior.query.filter_by(
            caregiver_id=caregiver_id,
            status='accepted'
        ).all()
        
        fleet_stats = []
        for rel in relationships:
            senior = rel.senior
            risk_score = AnalyticsService.calculate_risk_score(senior.id)
            
            # Determine status label
            status = 'Stable'
            if risk_score > 100:
                status = 'Critical'
            elif risk_score > 40:
                status = 'Attention'
                
            fleet_stats.append({
                'senior_id': senior.id,
                'senior_name': senior.username,
                'risk_score': risk_score,
                'status': status,
                'adherence_history': AnalyticsService.get_7_day_adherence(senior.id)
            })
            
        # Sort by risk score descending
        return sorted(fleet_stats, key=lambda x: x['risk_score'], reverse=True)

analytics_service = AnalyticsService()
