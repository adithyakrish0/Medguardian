from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.auth import User
from app.extensions import db
from sqlalchemy import func
from collections import defaultdict

class AnalyticsService:
    @staticmethod
    def get_adherence_history(user_id, days=7):
        """
        Get adherence data for the last X days for a specific user.
        OPTIMIZED: Uses a single batched query instead of N+1 queries.
        """
        today = datetime.now().date()
        now = datetime.now()
        
        # Get active medications for this user (single query)
        user_meds = Medication.query.filter_by(user_id=user_id).all()
        
        # Find the earliest medication creation date
        earliest_med_date = None
        for med in user_meds:
            if med.created_at:
                med_date = med.created_at.date()
                if earliest_med_date is None or med_date < earliest_med_date:
                    earliest_med_date = med_date
        
        # Calculate date range
        start_date = today - timedelta(days=days - 1)
        end_date = today
        
        # CRITICAL FIX: Single batched query for all days (instead of N+1)
        start_of_range = datetime.combine(start_date, datetime.min.time())
        end_of_range = datetime.combine(end_date, datetime.max.time())
        
        all_logs = MedicationLog.query.filter(
            MedicationLog.user_id == user_id,
            MedicationLog.taken_at >= start_of_range,
            MedicationLog.taken_at <= end_of_range
        ).all()
        
        # Group logs by date in Python (much faster than 30 DB queries)
        logs_by_date = defaultdict(list)
        for log in all_logs:
            date_key = log.taken_at.date()
            logs_by_date[date_key].append(log)
        
        days_data = []
        
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            is_today = (day == today)
            
            # Calculate expected doses for this day
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
            
            # Get pre-fetched logs for this day (no additional DB query!)
            day_logs = logs_by_date.get(day, [])
            
            taken = sum(1 for log in day_logs if log.get_status() == 'verified')
            skipped = sum(1 for log in day_logs if log.get_status() == 'skipped')
            missed = sum(1 for log in day_logs if log.get_status() == 'missed')
            
            # Determine if day is before any medication was created
            is_before_account = earliest_med_date and day < earliest_med_date
            
            if is_before_account:
                adherence = None
                is_locked = True
            elif expected_doses == 0:
                adherence = None
                is_locked = False
            else:
                adherence = int((taken / expected_doses) * 100)
                is_locked = False
            
            days_data.append({
                'date': day.strftime('%a') if days <= 7 else day.strftime('%d %b'),
                'full_date': day.isoformat(),
                'adherence': adherence,
                'taken': taken,
                'skipped': skipped,
                'missed': missed,
                'expected': expected_doses,
                'isLocked': is_locked,
                'isEstablishment': earliest_med_date and day == earliest_med_date
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
        
        # 1. 7-Day Adherence Penalty (exclude locked days and None values)
        stats = AnalyticsService.get_7_day_adherence(senior_id)
        valid_stats = [d['adherence'] for d in stats if d['adherence'] is not None and not d.get('isLocked', False)]
        avg_adherence = sum(valid_stats) / len(valid_stats) if valid_stats else 100
        score += (100 - avg_adherence)
        
        # 2. Recent Misses Penalty
        today_stats = next((d for d in stats if d['full_date'] == today.isoformat()), None)
        yesterday_stats = next((d for d in stats if d['full_date'] == yesterday.isoformat()), None)
        
        if today_stats:
            score += (today_stats['skipped'] * 25)
        if yesterday_stats:
            score += (yesterday_stats['skipped'] * 15)
            
        # 3. High Priority Penalty
        start_48h = datetime.combine(yesterday, datetime.min.time())
        recent_skips = MedicationLog.query.filter(
            MedicationLog.user_id == senior_id,
            MedicationLog.taken_correctly == False,
            MedicationLog.taken_at >= start_48h
        ).all()
        
        for skip in recent_skips:
            if skip.medication and skip.medication.priority == 'high':
                score += 50
                break
                
        return int(score)

    @staticmethod
    def get_fleet_analytics(caregiver_id):
        """Alias for get_fleet_telemetry to match API route expectations"""
        return AnalyticsService.get_fleet_telemetry(caregiver_id)

    @staticmethod
    def get_fleet_telemetry(caregiver_id):
        """
        Get detailed high-density telemetry for Care Overview.
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
            all_scheduled = []
            for med in meds:
                if med.created_at and med.created_at.date() > today:
                    continue
                
                reminder_times = med.get_reminder_times()
                for time_str in reminder_times:
                    try:
                        h, m = map(int, time_str.split(':'))
                        scheduled_dt = datetime.combine(today, datetime.min.time().replace(hour=h, minute=m))
                        
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
            
            all_scheduled.sort(key=lambda x: (x['hour'], x['minute']))
            
            telemetry.append({
                'senior_id': senior.id,
                'senior_name': senior.username,
                'risk_score': risk_score,
                'status': 'Critical' if risk_score > 100 else 'Attention' if risk_score > 40 else 'Stable',
                'sparkline': [d['adherence'] if d['adherence'] is not None else 0 for d in history],
                'heatmap': all_scheduled,
                'last_updated': now.isoformat()
            })
            
        return telemetry
            
    @staticmethod
    def analyze_risk_anomalies(user_id):
        """
        Analyze historical patterns to detect behavioral anomalies.
        Returns a list of detected patterns and a forecasted risk percentage.
        
        NOTE: ML prediction temporarily disabled to fix feature mismatch error.
        """
        try:
            history = AnalyticsService.get_adherence_history(user_id, 14)
            now = datetime.now()
            
            anomalies = []
            bonus_risk = 0
            
            def safe_avg(values):
                valid = [v for v in values if v is not None and isinstance(v, (int, float))]
                return sum(valid) / len(valid) if valid else 100

            # 1. Check if adherence has been declining over the last 3 valid days
            recent_trend = [d['adherence'] for d in history[-7:] if d['adherence'] is not None]
            if len(recent_trend) >= 3:
                v1, v2, v3 = recent_trend[-3], recent_trend[-2], recent_trend[-1]
                if v1 > v2 > v3:
                    anomalies.append({
                        'type': 'negative_trend',
                        'message': 'Downward adherence trend detected over last 72 hours.',
                        'severity': 'high'
                    })
                    bonus_risk += 40

            # 2. Check for "Weekend Lapse Syndrome"
            weekends = [d['adherence'] for d in history if d['adherence'] is not None and datetime.fromisoformat(d['full_date']).weekday() >= 5]
            weekdays = [d['adherence'] for d in history if d['adherence'] is not None and datetime.fromisoformat(d['full_date']).weekday() < 5]
            
            if weekends and weekdays:
                avg_weekend = safe_avg(weekends)
                avg_weekday = safe_avg(weekdays)
                
                if avg_weekday - avg_weekend > 20:
                    anomalies.append({
                        'type': 'weekend_lapse',
                        'message': 'Statistical probability of weekend adherence lapse is high (20%+ delta).',
                        'severity': 'attention'
                    })
                    bonus_risk += 30

            # 3. Forecasted risk for the next 24 hours
            recent_stats = [d['adherence'] for d in history[-3:] if d['adherence'] is not None]
            current_avg = safe_avg(recent_stats)
            forecasted_risk = min(int((100 - current_avg) + bonus_risk), 100)
            
            # --- PK Engine Integration (Plasma Concentration Alerts) ---
            pk_alerts = []
            try:
                from app.services.pk_engine import pk_engine
                active_meds = Medication.query.filter_by(user_id=user_id, priority='high').all()
                for med in active_meds:
                    pk_data = pk_engine.get_state(user_id, med.id)
                    if pk_data and 'plasma_concentration' in pk_data:
                        conc = pk_data['plasma_concentration']
                        if conc > 0.85:
                            pk_alerts.append({
                                'medication': med.name,
                                'type': 'toxicity_risk',
                                'message': f'Elevated plasma levels for {med.name}. Risk of toxicity.',
                                'severity': 'high'
                            })
                        elif conc < 0.15:
                            pk_alerts.append({
                                'medication': med.name,
                                'type': 'sub_therapeutic',
                                'message': f'Sub-therapeutic levels for {med.name}. Effectiveness reduced.',
                                'severity': 'attention'
                            })
            except Exception as pk_err:
                print(f"⚠️ [ANALYTICS] PK engine error (non-critical): {pk_err}")
            
            # --- ML-Based Prediction (TEMPORARILY DISABLED) ---
            # The ML model has a feature mismatch (priority vs priority_encoded).
            # Returning empty forecast until the model is retrained.
            ml_forecast = []
            # try:
            #     from app.services.prediction_service import prediction_service
            #     upcoming_meds = Medication.query.filter_by(user_id=user_id).all()
            #     for med in upcoming_meds:
            #         times = med.get_reminder_times()
            #         for t in times:
            #             h, m = map(int, t.split(':'))
            #             next_dt = datetime.combine(datetime.now().date(), datetime.min.time().replace(hour=h, minute=m))
            #             if next_dt < datetime.now():
            #                 next_dt += timedelta(days=1)
            #             prediction = prediction_service.predict_next_dose(med.id, next_dt)
            #             ml_forecast.append({
            #                 'medication': med.name,
            #                 'time': t,
            #                 'probability': prediction['probability'],
            #                 'risk_level': prediction.get('risk_level', 'Unknown')
            #             })
            # except Exception as ml_err:
            #     print(f"⚠️ [ANALYTICS] ML prediction error (non-critical): {ml_err}")
            
            return {
                'anomalies': anomalies,
                'pk_alerts': pk_alerts,
                'forecasted_risk': max(0, forecasted_risk),
                'ml_forecast': ml_forecast[:5],
                'confidence': 85 if len(history) >= 7 else 50
            }
        except Exception as e:
            import traceback
            import sys
            print(f"❌ [ANALYTICS] Error in analyze_risk_anomalies for user {user_id}: {str(e)}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return {
                'anomalies': [],
                'forecasted_risk': 0,
                'confidence': 0,
                'error': str(e)
            }

analytics_service = AnalyticsService()
