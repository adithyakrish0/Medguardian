import numpy as np
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class PKEngine:
    """
    Pharmacokinetic (PK) Simulation Engine for Bio-Digital Twin.
    Simulates drug plasma concentration (Cp) using a one-compartment open model.
    """
    
    # Typical PK parameters for common drugs (simplified for demonstration)
    # ka: absorption rate, ke: elimination rate, Vd: volume of distribution
    DEFAULT_PARAMS = {
        'ka': 1.2,  # hr^-1 (Fast absorption)
        'ke': 0.15, # hr^-1 (Standard elimination)
        'Vd': 40.0, # Liters
        'dose': 500 # mg
    }

    @staticmethod
    def simulate_plasma_concentration(dose_times, total_hours=24, resolution=10):
        """
        Calculate Cp for a series of doses over a time period.
        
        Args:
            dose_times (list): List of relative hours when doses were taken (e.g. [0, 8, 16])
            total_hours (int): Duration of simulation
            resolution (int): Data points per hour
            
        Returns:
            list: List of (time, concentration) tuples
        """
        ka = PKEngine.DEFAULT_PARAMS['ka']
        ke = PKEngine.DEFAULT_PARAMS['ke']
        Vd = PKEngine.DEFAULT_PARAMS['Vd']
        D = PKEngine.DEFAULT_PARAMS['dose']
        
        t_values = np.linspace(0, total_hours, total_hours * resolution)
        cp_total = np.zeros_like(t_values)
        
        for dose_t in dose_times:
            # Shift time to start from dose_t
            shifted_t = t_values - dose_t
            mask = shifted_t >= 0
            
            # Integrated multi-dose equation
            # Cp(t) = [ (ka * D) / (Vd * (ka - ke)) ] * [ e^(-ke*t) - e^(-ka*t) ]
            coeff = (ka * D) / (Vd * (ka - ke))
            cp_dose = coeff * (np.exp(-ke * shifted_t[mask]) - np.exp(-ka * shifted_t[mask]))
            cp_total[mask] += cp_dose
            
        return list(zip(t_values.tolist(), cp_total.tolist()))

    @staticmethod
    def get_therapeutic_window():
        """Returns the y-axis ranges for the therapeutic window overlay."""
        return {
            'sub_therapeutic': [0, 5],
            'therapeutic': [5, 15],
            'toxicity': [15, 25]
        }

    def get_state(self, user_id, medication_id):
        """Calculate current PK state based on recent medication logs."""
        from app.models.medication_log import MedicationLog
        from datetime import datetime
        import numpy as np

        # Get logs from last 24 hours
        yesterday = datetime.now() - timedelta(hours=24)
        logs = MedicationLog.query.filter(
            MedicationLog.user_id == user_id,
            MedicationLog.medication_id == medication_id,
            MedicationLog.taken_at >= yesterday,
            MedicationLog.taken_correctly == True
        ).all()

        if not logs:
            return {'plasma_concentration': 0, 'status': 'Sub-therapeutic'}

        # Calculate relative hours from each log to 'now'
        now = datetime.now()
        dose_times = []
        for log in logs:
            offset = (now - log.taken_at).total_seconds() / 3600.0
            # Since we want relative to the START of the 24h window for the simulation
            # but here we just want the value AT 'now'.
            # The simulation uses dose_t as the time the dose was taken relative to start.
            # If we say 'now' is T=24, then dose_t = 24 - (now - taken_at).
            # But it's simpler to just use the decay formula directly.
            dose_times.append(log.taken_at)

        # Re-using simulation logic for a single point 'now'
        ka = self.DEFAULT_PARAMS['ka']
        ke = self.DEFAULT_PARAMS['ke']
        Vd = self.DEFAULT_PARAMS['Vd']
        D = self.DEFAULT_PARAMS['dose']
        coeff = (ka * D) / (Vd * (ka - ke))

        current_cp = 0
        for taken_at in dose_times:
            t = (now - taken_at).total_seconds() / 3600.0
            if t >= 0:
                val = coeff * (np.exp(-ke * t) - np.exp(-ka * t))
                current_cp += val

        status = 'Therapeutic'
        if current_cp < 2: status = 'Sub-therapeutic'
        if current_cp > 12: status = 'High'
        if current_cp > 20: status = 'Toxicity Risk'

        # Normalize concentration for the UI (0.0 to 1.0 mapping roughly to therapeutic range)
        normalized = min(current_cp / 25.0, 1.0)

        return {
            'plasma_concentration': normalized,
            'current_cp': round(current_cp, 2),
            'status': status,
            'last_dose': logs[-1].taken_at.isoformat() if logs else None
        }

# Singleton
pk_engine = PKEngine()
