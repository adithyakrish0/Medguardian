from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.auth import User
from app.extensions import db
from sqlalchemy import func

class AnalyticsService:
    @staticmethod
    def get_7_day_adherence(user_id):
        """Get adherence data for the last 7 days for a specific user"""
        today = datetime.now().date()
        days_data = []
        
        # We need to know how many medications are scheduled per day
        # For simplicity, we'll get active medications
        user_meds = Medication.query.filter_by(user_id=user_id).all()
        # Filter for active meds (this is a bit rough as meds might have changed recently)
        # But for UI Sparklines, this is usually acceptable.
        expected_per_day = 0
        for med in user_meds:
            expected_per_day += len(med.get_reminder_times())
            
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            start_of_day = datetime.combine(day, datetime.min.time())
            end_of_day = datetime.combine(day, datetime.max.time())
            
            day_logs = MedicationLog.query.filter(
                MedicationLog.user_id == user_id,
                MedicationLog.taken_at >= start_of_day,
                MedicationLog.taken_at <= end_of_day
            ).all()
            
            taken = sum(1 for log in day_logs if log.taken_correctly)
            skipped = sum(1 for log in day_logs if not log.taken_correctly)
            
            # Simple adherence calculation
            # If total expected is 0, we'll say 100% unless there's a skip
            if expected_per_day == 0:
                adherence = 100 if skipped == 0 else 0
            else:
                adherence = int((taken / expected_per_day) * 100)
            
            days_data.append({
                'date': day.strftime('%a'),
                'full_date': day.isoformat(),
                'adherence': min(adherence, 100),
                'taken': taken,
                'skipped': skipped,
                'expected': expected_per_day
            })
            
        return days_data

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
