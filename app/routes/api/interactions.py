"""API v1 - Drug Interaction Endpoints

Provides comprehensive drug interaction checking with:
- Risk score calculation (0-100)
- Severity-weighted analysis
- Graph data for D3.js visualization
- Patient-wide interaction checks
"""
import json
from flask import jsonify, request
from flask_login import login_required, current_user
from datetime import datetime
from . import api_v1
from app.models.medication import Medication
from app.models.relationship import CaregiverSenior
from app.utils.interaction_checker import interaction_checker


@api_v1.route('/interactions/check', methods=['POST'])
@login_required
def check_interactions():
    """
    Check for drug interactions.
    
    Accepts either:
    - {"patient_id": 123} - Check all medications for a patient
    - {"medications": ["Warfarin", "Aspirin"]} - Check specific medication list
    
    Returns:
        {
            "success": true,
            "risk_score": 85,
            "risk_level": "critical",
            "total_interactions": 2,
            "interactions": [...],
            "severity_breakdown": {"critical": 1, "major": 1, ...},
            "recommendation": "...",
            "graph_data": {"nodes": [...], "edges": [...]}
        }
    """
    try:
        data = request.get_json() or {}
        
        # Get medication list either from patient_id or direct list
        patient_id = data.get('patient_id')
        medications_list = data.get('medications', [])
        senior_id = data.get('senior_id')  # For caregiver access
        
        if patient_id or senior_id:
            target_user_id = patient_id or senior_id
            
            # Security: Verify access rights
            if target_user_id != current_user.id:
                relationship = CaregiverSenior.query.filter_by(
                    caregiver_id=current_user.id,
                    senior_id=target_user_id,
                    status='accepted'
                ).first()
                if not relationship:
                    return jsonify({
                        'success': False,
                        'error': 'Access denied to this patient\'s data'
                    }), 403
            
            # Get patient's medications
            medications = Medication.query.filter_by(user_id=target_user_id).all()
            medications_list = [med.name for med in medications]
        
        if not medications_list or len(medications_list) < 2:
            return jsonify({
                'success': True,
                'risk_score': 0,
                'risk_level': 'safe',
                'total_interactions': 0,
                'interactions': [],
                'severity_breakdown': {'critical': 0, 'major': 0, 'moderate': 0, 'minor': 0},
                'recommendation': '✅ No interactions to check. Add medications to analyze.',
                'medications_checked': medications_list,
                'graph_data': {'nodes': [], 'edges': []}
            }), 200
        
        # Get comprehensive interaction analysis
        result = interaction_checker.get_interaction_summary(medications_list)
        
        # Add graph data for visualization
        result['graph_data'] = interaction_checker.get_graph_data(medications_list)
        result['success'] = True
        result['checked_at'] = datetime.utcnow().isoformat()
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error checking interactions: {str(e)}'
        }), 500


@api_v1.route('/interactions/graph', methods=['GET'])
@api_v1.route('/interactions/graph/<int:patient_id>', methods=['GET'])
@login_required
def get_interaction_graph(patient_id=None):
    """
    Get graph visualization data for a patient's medications.
    
    Returns D3.js compatible graph data with:
    - nodes: medication names with interaction flags
    - edges: interactions with severity colors
    """
    try:
        target_user_id = patient_id or request.args.get('senior_id', type=int) or current_user.id
        
        # Security check
        if target_user_id != current_user.id:
            relationship = CaregiverSenior.query.filter_by(
                caregiver_id=current_user.id,
                senior_id=target_user_id,
                status='accepted'
            ).first()
            if not relationship:
                return jsonify({
                    'success': False,
                    'error': 'Access denied'
                }), 403
        
        # Get medications
        medications = Medication.query.filter_by(user_id=target_user_id).all()
        medication_names = [med.name for med in medications]
        
        if not medication_names:
            return jsonify({
                'success': True,
                'graph_data': {'nodes': [], 'edges': []},
                'message': 'No medications found'
            }), 200
        
        # Generate graph data
        graph_data = interaction_checker.get_graph_data(medication_names)
        
        # Add medication metadata to nodes
        med_map = {med.name.lower(): med for med in medications}
        for node in graph_data['nodes']:
            med = med_map.get(node['id'])
            if med:
                node['medication_id'] = med.id
                node['dosage'] = med.dosage
                node['frequency'] = med.frequency
        
        return jsonify({
            'success': True,
            'patient_id': target_user_id,
            'medication_count': len(medication_names),
            'graph_data': graph_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/interactions/quick-check', methods=['POST'])
@login_required
def quick_check_new_medication():
    """
    Quick check when adding a new medication.
    
    Input: {"new_medication": "Warfarin", "senior_id": 123}
    
    Checks if the new medication interacts with existing ones.
    Returns warnings to display in AddMedicationModal.
    """
    try:
        data = request.get_json() or {}
        new_medication = data.get('new_medication') or data.get('name')
        senior_id = data.get('senior_id') or current_user.id
        
        if not new_medication:
            return jsonify({
                'success': False,
                'error': 'Medication name required'
            }), 400
        
        # Security check
        if senior_id != current_user.id:
            relationship = CaregiverSenior.query.filter_by(
                caregiver_id=current_user.id,
                senior_id=senior_id,
                status='accepted'
            ).first()
            if not relationship:
                return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get existing medications
        existing_meds = Medication.query.filter_by(user_id=senior_id).all()
        existing_names = [med.name for med in existing_meds]
        
        if not existing_names:
            return jsonify({
                'success': True,
                'has_interactions': False,
                'interactions': [],
                'message': 'No existing medications to check against'
            }), 200
        
        # Check interactions between new med and all existing
        all_meds = existing_names + [new_medication]
        interactions = interaction_checker.check_interactions(all_meds)
        
        # Filter to only interactions involving the new medication
        relevant_interactions = [
            i for i in interactions
            if new_medication.lower() in i['medication1'].lower() 
            or new_medication.lower() in i['medication2'].lower()
        ]
        
        # Calculate risk for just these interactions
        risk_score, risk_level = interaction_checker.calculate_risk_score(relevant_interactions)
        
        return jsonify({
            'success': True,
            'new_medication': new_medication,
            'existing_medications': existing_names,
            'has_interactions': len(relevant_interactions) > 0,
            'interaction_count': len(relevant_interactions),
            'risk_score': risk_score,
            'risk_level': risk_level,
            'interactions': relevant_interactions,
            'show_warning': risk_level in ['critical', 'high', 'moderate']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/interactions/stats', methods=['GET'])
@login_required
def get_interaction_stats():
    """
    Get statistics about the interaction database.
    Useful for displaying in UI (e.g., "Checking against 60+ known interactions")
    """
    try:
        return jsonify({
            'success': True,
            'total_interactions': interaction_checker.get_interaction_count(),
            'categories': interaction_checker.get_categories(),
            'severity_levels': ['critical', 'major', 'moderate', 'minor'],
            'version': '1.0.0',
            'last_updated': '2026-02-10'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
