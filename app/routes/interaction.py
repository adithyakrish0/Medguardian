import json
from flask import Blueprint, request, jsonify, render_template
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_interaction import MedicationInteraction, InteractionCheckResult
from app.models.medication_log import MedicationLog
from datetime import datetime
from app.utils.interaction_checker import interaction_checker

interaction = Blueprint('interaction', __name__)

@interaction.route('/')
@login_required
def index():
    """Display interaction checker page"""
    from app.models.medication import Medication
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('interactions/checker.html', medications=medications)

@interaction.route('/check-interactions', methods=['POST'])
@login_required
def check_interactions():
    """Check for medication interactions for the current user"""
    try:
        # Get user's medications
        user_medications = Medication.query.filter_by(user_id=current_user.id).all()
        
        if not user_medications:
            return jsonify({
                'success': True,
                'message': 'No medications found to check',
                'interactions': [],
                'overall_risk': 'low',
                'summary': 'No medications currently tracked'
            })
        
        # Extract medication names
        medication_names = [med.name for med in user_medications]
        
        # Use the interaction checker utility
        interactions_found = interaction_checker.check_interactions(medication_names)
        
        # Calculate overall risk
        overall_risk = calculate_overall_risk(interactions_found)
        
        # Generate summary recommendation
        summary_recommendation = generate_summary_recommendation(interactions_found, overall_risk)
        
        # Save check result
        save_check_result(user_medications, interactions_found, overall_risk, summary_recommendation)
        
        return jsonify({
            'success': True,
            'message': f'Found {len(interactions_found)} potential interactions',
            'interactions': interactions_found,
            'overall_risk': overall_risk,
            'summary': summary_recommendation,
            'medications_count': len(user_medications)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error checking interactions: {str(e)}'
        }), 500

@interaction.route('/interaction-history')
@login_required
def interaction_history():
    """View interaction check history"""
    try:
        results = InteractionCheckResult.query.filter_by(user_id=current_user.id)\
            .order_by(InteractionCheckResult.check_date.desc()).limit(10).all()
        
        history = [result.to_dict() for result in results]
        
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching history: {str(e)}'
        }), 500

@interaction.route('/add-interaction', methods=['POST'])
@login_required
def add_interaction():
    """Manually add an interaction (for admin/caregiver use)"""
    try:
        data = request.get_json()
        
        required_fields = ['medication1_name', 'medication2_name', 'severity', 'description', 'recommendation']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Find medications by name
        med1 = Medication.query.filter_by(name=data['medication1_name']).first()
        med2 = Medication.query.filter_by(name=data['medication2_name']).first()
        
        if not med1 or not med2:
            return jsonify({
                'success': False,
                'message': 'One or both medications not found'
            }), 404
        
        # Create new interaction
        new_interaction = MedicationInteraction(
            medication1_id=med1.id,
            medication2_id=med2.id,
            severity=data['severity'],
            description=data['description'],
            recommendation=data['recommendation'],
            source=data.get('source', 'manual'),
            risk_factors=json.dumps(data.get('risk_factors', []))
        )
        
        db.session.add(new_interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Interaction added successfully',
            'interaction_id': new_interaction.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error adding interaction: {str(e)}'
        }), 500

@interaction.route('/interactions/<int:medication_id>')
@login_required
def get_medication_interactions(medication_id):
    """Get all interactions for a specific medication"""
    try:
        # Verify user owns the medication
        medication = Medication.query.get_or_404(medication_id)
        if medication.user_id != current_user.id:
            return jsonify({
                'success': False,
                'message': 'Permission denied'
            }), 403
        
        # Find all interactions involving this medication
        interactions = MedicationInteraction.query.filter(
            (MedicationInteraction.medication1_id == medication_id) |
            (MedicationInteraction.medication2_id == medication_id)
        ).all()
        
        interaction_data = []
        for interaction in interactions:
            interaction_dict = interaction.to_dict()
            
            # Determine the other medication
            if interaction.medication1_id == medication_id:
                interaction_dict['other_medication'] = interaction.medication2.name
                interaction_dict['other_medication_id'] = interaction.medication2.id
            else:
                interaction_dict['other_medication'] = interaction.medication1.name
                interaction_dict['other_medication_id'] = interaction.medication1.id
            
            interaction_data.append(interaction_dict)
        
        return jsonify({
            'success': True,
            'medication': medication.name,
            'interactions': interaction_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching interactions: {str(e)}'
        }), 500

def calculate_overall_risk(interactions):
    """Calculate overall risk level based on interactions found"""
    if not interactions:
        return 'low'
    
    # Check for critical interactions
    critical_count = sum(1 for interaction in interactions if interaction['severity'] == 'critical')
    if critical_count > 0:
        return 'critical'
    
    # Check for major interactions
    major_count = sum(1 for interaction in interactions if interaction['severity'] == 'major')
    if major_count >= 2:
        return 'high'
    elif major_count == 1:
        return 'moderate'
    
    # Only moderate interactions
    if any(interaction['severity'] == 'moderate' for interaction in interactions):
        return 'moderate'
    
    return 'low'

def generate_summary_recommendation(interactions, overall_risk):
    """Generate summary recommendation based on interactions"""
    if not interactions:
        return "No medication interactions found. Your medication regimen appears safe."
    
    risk_messages = {
        'critical': "⚠️ CRITICAL RISK: Consult your doctor immediately. Some interactions may be dangerous.",
        'high': "🔴 HIGH RISK: Schedule a doctor's appointment soon to review your medications.",
        'moderate': "🟡 MODERATE RISK: Discuss these interactions with your healthcare provider.",
        'low': "🟢 LOW RISK: Some minor interactions found. Monitor for symptoms."
    }
    
    summary = risk_messages.get(overall_risk, "Unknown risk level")
    
    # Add specific recommendations
    if interactions:
        summary += "\n\nSpecific concerns:"
        for interaction in interactions[:3]:  # Show top 3 interactions
            summary += f"\n• {interaction['medication1']} + {interaction['medication2']}: {interaction['severity'].upper()}"
    
    return summary

def save_check_result(medications, interactions, overall_risk, summary_recommendation):
    """Save the interaction check result to database"""
    try:
        # Convert medications to JSON
        medications_json = json.dumps([{'id': med.id, 'name': med.name} for med in medications])
        
        # Convert interactions to JSON
        interactions_json = json.dumps(interactions)
        
        # Create check result
        check_result = InteractionCheckResult(
            user_id=current_user.id,
            medications_checked=medications_json,
            interactions_found=interactions_json,
            overall_risk=overall_risk,
            summary_recommendation=summary_recommendation
        )
        
        db.session.add(check_result)
        db.session.commit()
        
    except Exception as e:
        # Don't fail the main operation if saving fails
        print(f"Error saving check result: {e}")
