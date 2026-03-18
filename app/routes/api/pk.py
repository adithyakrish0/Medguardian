from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from app.models.medication import Medication
from app.extensions import db
import math

pk_bp = Blueprint('pk', __name__)

@pk_bp.route('/pk/simulate', methods=['POST'])
@login_required
def simulate_pk():
    """Simulate pharmacokinetic profile for a medication"""
    try:
        data = request.get_json()
        medication_name = data.get('medication', 'Unknown')
        # Try to extract number from dosage string like "500mg"
        dose_str = str(data.get('dose_mg', '500'))
        try:
            dose = float(''.join(c for c in dose_str if c.isdigit() or c == '.'))
        except (ValueError, TypeError):
            dose = 500.0
        
        # PK parameters by medication type (simplified but realistic)
        pk_params = {
            'Metformin': {'ka': 0.8, 'ke': 0.15, 'vd': 654, 'tmax': 2.5, 'bioavailability': 0.55},
            'Lisinopril': {'ka': 1.2, 'ke': 0.08, 'vd': 210, 'tmax': 7.0, 'bioavailability': 0.25},
            'Atorvastatin': {'ka': 2.0, 'ke': 0.35, 'vd': 381, 'tmax': 1.0, 'bioavailability': 0.14},
            'Aspirin': {'ka': 3.5, 'ke': 0.45, 'vd': 10, 'tmax': 0.5, 'bioavailability': 0.68},
            'Amlodipine': {'ka': 0.4, 'ke': 0.02, 'vd': 1650, 'tmax': 8.0, 'bioavailability': 0.64},
            'Omeprazole': {'ka': 1.8, 'ke': 0.55, 'vd': 31, 'tmax': 1.5, 'bioavailability': 0.35},
            'Vitamin D3': {'ka': 0.3, 'ke': 0.004, 'vd': 3500, 'tmax': 12.0, 'bioavailability': 0.60},
        }
        
        params = pk_params.get(medication_name, {'ka': 1.0, 'ke': 0.2, 'vd': 200, 'tmax': 2.0, 'bioavailability': 0.5})
        
        ka = params['ka']
        ke = params['ke']
        vd = params['vd']
        F = params['bioavailability']
        
        # Generate concentration-time curve (0 to 24 hours)
        timepoints = [i * 0.5 for i in range(49)]  # 0 to 24h in 0.5h steps
        concentrations = []
        
        for t in timepoints:
            if t == 0:
                concentrations.append(0)
            else:
                # Two-compartment oral absorption model: C(t) = (F * D * ka) / (Vd * (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
                try:
                    c = (F * dose * ka) / (vd * (ka - ke)) * (math.exp(-ke * t) - math.exp(-ka * t))
                    concentrations.append(max(0, round(c * 1000, 3)))  # convert to ng/mL
                except:
                    concentrations.append(0)
        
        cmax = max(concentrations)
        tmax_actual = timepoints[concentrations.index(cmax)]
        half_life = round(0.693 / ke, 1)
        
        return jsonify({
            'success': True,
            'data': {
                'medication': medication_name,
                'dose_mg': dose,
                'timepoints': timepoints,
                'concentrations': concentrations,
                'cmax': round(cmax, 2),
                'tmax': tmax_actual,
                'half_life': half_life,
                'bioavailability': round(F * 100),
                'vd': vd,
                'therapeutic_range': get_therapeutic_range(medication_name)
            }
        })
    except Exception as e:
        import traceback
        current_app.logger.error(f"❌ Error in simulate_pk: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

def get_therapeutic_range(med_name):
    ranges = {
        'Metformin': {'min': 0.1, 'max': 1.0, 'unit': 'mg/L'},
        'Lisinopril': {'min': 10, 'max': 100, 'unit': 'ng/mL'},
        'Atorvastatin': {'min': 5, 'max': 50, 'unit': 'ng/mL'},
        'Aspirin': {'min': 150, 'max': 300, 'unit': 'mg/L'},
        'Amlodipine': {'min': 2, 'max': 15, 'unit': 'ng/mL'},
    }
    return ranges.get(med_name, {'min': 10, 'max': 100, 'unit': 'ng/mL'})

@pk_bp.route('/pk/medications', methods=['GET'])
@login_required
def get_pk_medications():
    """Get medications for PK simulation. Seniors see their own, caregivers see seniors'."""
    from app.models.auth import User
    from app.models.relationship import CaregiverSenior

    try:
        if current_user.role == 'caregiver':
            # Get all seniors linked to this caregiver
            relationships = CaregiverSenior.query.filter_by(caregiver_id=current_user.id, status='accepted').all()
            senior_ids = [rel.senior_id for rel in relationships]
            
            if not senior_ids:
                return jsonify({'success': True, 'data': []})
                
            # Get meds for all these seniors
            meds = Medication.query.filter(Medication.user_id.in_(senior_ids)).all()
            active_meds = [m for m in meds if m.is_active]
            
            return jsonify({
                'success': True,
                'data': [{'id': m.id, 'name': f"{m.name} ({m.user.username if m.user else 'Unknown'})", 'dosage': m.dosage} for m in active_meds]
            })
        else:
            # Seniors see their own meds
            meds = Medication.query.filter_by(user_id=current_user.id).all()
            active_meds = [m for m in meds if m.is_active]
            return jsonify({
                'success': True,
                'data': [{'id': m.id, 'name': m.name, 'dosage': m.dosage} for m in active_meds]
            })
    except Exception as e:
        import traceback
        current_app.logger.error(f"❌ Error in get_pk_medications: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
