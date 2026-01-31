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
    def get_fleet_telemetry(caregiver_id):
        """
        Get detailed high-density telemetry for the War Room.
        Includes 7-day sparkline data and 24-hr dose status (heat map).
        """
        from app.models.relationship import CaregiverSenior
        
        relationships = CaregiverSenior.query.filter_by(
            caregiver_id=caregiver_id,
            status='accepted'
        ).all()
        
        today = datetime.now().date()
        now = datetime.now()
        telemetry = []
        
        for rel in relationships:
            senior = rel.senior
            risk_score = AnalyticsService.calculate_risk_score(senior.id)
            
            # 7-day adherence for sparkline
            history = AnalyticsService.get_7_day_adherence(senior.id)
            
            # 24-hour dose status for heatmap
            meds = Medication.query.filter_by(user_id=senior.id).all()
            today_logs = MedicationLog.query.filter(
                MedicationLog.user_id == senior.id,
                db.func.date(MedicationLog.taken_at) == today
            ).all()
            
            heatmap = []
            # Calculate all dosages for today
            all_scheduled = []
            for med in meds:
                if med.created_at and med.created_at.date() > today:
                    continue
                
                reminder_times = med.get_reminder_times()
                for time_str in reminder_times:
                    try:
                        h, m = map(int, time_str.split(':'))
                        scheduled_dt = datetime.combine(today, datetime.min.time().replace(hour=h, minute=m))
                        
                        # Find if there is a log for this med around this time
                        # (simplistic check: same day, same med)
                        log = next((l for l in today_logs if l.medication_id == med.id and abs((l.taken_at - scheduled_dt).total_seconds()) < 7200), None)
                        
                        status = 'upcoming'
                        if log:
                            status = 'taken' if log.taken_correctly else 'missed'
                        elif scheduled_dt + timedelta(minutes=60) < now:
                            status = 'missed'
                            
                        all_scheduled.append({
                            'time': time_str,
                            'hour': h,
                            'minute': m,
                            'status': status,
                            'med_name': med.name
                        })
                    except: continue
            
            # Sort by time
            all_scheduled.sort(key=lambda x: (x['hour'], x['minute']))
            
            telemetry.append({
                'senior_id': senior.id,
                'senior_name': senior.username,
                'risk_score': risk_score,
                'status': 'Critical' if risk_score > 100 else 'Attention' if risk_score > 40 else 'Stable',
                'sparkline': [d['adherence'] for d in history],
                'heatmap': all_scheduled,
                'last_updated': now.isoformat()
            })
            
    @staticmethod
    def analyze_risk_anomalies(user_id):
        """
        Analyze historical patterns to detect behavioral anomalies.
        Returns a list of detected patterns and a forecasted risk percentage.
        """
        history = AnalyticsService.get_adherence_history(user_id, 14) # Check last 2 weeks
        now = datetime.now()
        
        anomalies = []
        risk_score = 0
        
        # 1. Pattern: Specific Time-of-Day consistent misses
        time_miss_map = {}
        for day in history:
            # We need to look at specific logs for these days to find time patterns
            # But get_adherence_history only returns daily sums
            pass # Placeholder for more complex log analysis if needed
            
        # Simplified: Check if adherence has been declining over the last 3 days
        if len(history) >= 3:
            recent_trend = [d['adherence'] for d in history[-3:]]
            if recent_trend[0] > recent_trend[1] > recent_trend[2]:
                anomalies.append({
                    'type': 'negative_trend',
                    'message': 'Downward adherence trend detected over last 72 hours.',
                    'severity': 'high'
                })
                risk_score += 40

        # 2. Check for "Weekend Lapse Syndrome"
        weekends = [d for d in history if datetime.fromisoformat(d['full_date']).weekday() >= 5]
        if weekends:
            avg_weekend = sum(d['adherence'] for d in weekends) / len(weekends)
            weekdays = [d for d in history if datetime.fromisoformat(d['full_date']).weekday() < 5]
            avg_weekday = sum(d['adherence'] for d in weekdays) / len(weekdays) if weekdays else 100
            
            if avg_weekday - avg_weekend > 20:
                anomalies.append({
                    'type': 'weekend_lapse',
                    'message': 'Statistical probability of weekend adherence lapse is high (20%+ delta).',
                    'severity': 'attention'
                })
                risk_score += 30

        # 3. Forecasted risk for the next 24 hours
        # Base risk is current risk score divided by max reasonable score
        forecasted_risk = min(int(risk_score + (100 - (sum(d['adherence'] for d in history[-3:]) / 3 if len(history) >=3 else 100))), 100)
        
        return {
            'anomalies': anomalies,
            'forecasted_risk': forecasted_risk,
            'confidence': 85 if len(history) >= 7 else 50
        }

analytics_service = AnalyticsService()
