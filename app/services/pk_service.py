import math
from datetime import datetime, timedelta
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from sqlalchemy import desc

from app.services.pk_engine import pk_engine

class PKService:
    """
    Pharmacokinetic (PK) Simulation Engine (Upgraded).
    Uses professional 1-compartment differential equations.
    """
    
    @staticmethod
    def calculate_current_concentration(user_id):
        """Aggregate current plasma saturation across all medications."""
        try:
            meds = Medication.query.filter_by(user_id=user_id).all()
            if not meds: return []

            results = []
            now = datetime.utcnow()
            
            for med in meds:
                # Get last 48h doses
                logs = MedicationLog.query.filter(
                    MedicationLog.medication_id == med.id,
                    MedicationLog.taken_correctly == True,
                    MedicationLog.taken_at >= now - timedelta(hours=48)
                ).all()

                if not logs: continue

                # Calculate relative hours since each dose
                dose_times = [(now - log.taken_at).total_seconds() / 3600 for log in logs]
                
                # We need to simulate 'now' (t=0 relative to now is complex, 
                # let's just use the engine to get the current point)
                full_sim = pk_engine.simulate_plasma_concentration(dose_times, total_hours=1, resolution=1)
                current_cp = full_sim[-1][1] if full_sim else 0

                status = "Optimal"
                if current_cp < 5: status = "Sub-Therapeutic"
                elif current_cp > 15: status = "Toxicity Warning"

                results.append({
                    'medication': med.name,
                    'concentration_mg_l': round(current_cp, 2),
                    'status': status
                })
            return results
        except Exception as e:
            logger.error(f"PK Calculation error: {e}")
            return []

    @staticmethod
    def generate_24h_forecast(user_id):
        """Generates future Bio-Twin curve for the dashboard."""
        try:
            # For the chart, we'll aggregate all meds or pick the most critical one
            meds = Medication.query.filter_by(user_id=user_id).all()
            if not meds: return {}

            now = datetime.utcnow()
            # Combine all doses from all meds for total load simulation
            all_logs = MedicationLog.query.filter(
                MedicationLog.user_id == user_id,
                MedicationLog.taken_correctly == True,
                MedicationLog.taken_at >= now - timedelta(hours=48)
            ).all()

            # Past doses (relative to 24h ago to show a bit of history + future)
            start_time = now - timedelta(hours=12)
            dose_offsets = [(log.taken_at - start_time).total_seconds() / 3600 for log in all_logs]
            
            # Simulate 36 hours (12 past + 24 future)
            sim_data = pk_engine.simulate_plasma_concentration(dose_offsets, total_hours=36)
            
            formatted_curve = []
            for t, cp in sim_data:
                point_time = start_time + timedelta(hours=t)
                formatted_curve.append({
                    'time': point_time.strftime("%H:%M"),
                    'concentration': round(cp, 2),
                    'is_future': point_time > now
                })

            return {
                'points': formatted_curve,
                'windows': pk_engine.get_therapeutic_window()
            }
        except Exception as e:
            logger.error(f"PK Forecast error: {e}")
            return {}
