# app/routes/interactions.py
"""
Drug Interaction Checker routes
Uses Gemini AI to check for dangerous medication combinations
"""
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user

interactions = Blueprint('interactions', __name__)

@interactions.route('/')
@login_required
def checker():
    """Drug interaction checker page"""
    from app.models.medication import Medication
    
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('interactions/checker.html', medications=medications)

@interactions.route('/check', methods=['POST'])
@login_required
def check():
    """
    Check drug interactions using Gemini AI
    """
    try:
        data = request.get_json()
        medications = data.get('medications', [])
        
        if not medications or len(medications) < 2:
            return jsonify({
                'success': False, 
                'error': 'Please select at least 2 medications to check for interactions'
            })
        
        # Import gemini service
        from app.services.gemini_service import gemini_service
        
        if not gemini_service.is_configured():
            # Fallback: return sample data for demo
            return jsonify({
                'success': True,
                'data': {
                    'interactions': [],
                    'safe': True,
                    'summary': 'Unable to check interactions (AI not configured). Please consult your doctor.',
                    'disclaimer': True
                }
            })
        
        # Check interactions with Gemini
        result = check_interactions_with_gemini(medications)
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


def check_interactions_with_gemini(medications):
    """Use Gemini AI to check drug interactions"""
    import os
    import json
    import requests
    
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {'success': False, 'error': 'Gemini API not configured'}
    
    # Build medication list string
    med_list = ", ".join(medications)
    
    prompt = f"""You are a medical safety assistant. Analyze the following medications for potential drug interactions.

Medications: {med_list}

Provide your response in this exact JSON format:
{{
    "interactions": [
        {{
            "drugs": ["Drug1", "Drug2"],
            "severity": "high|moderate|low",
            "description": "Brief description of the interaction",
            "recommendation": "What to do about it"
        }}
    ],
    "safe": true/false,
    "summary": "Overall summary of safety"
}}

Rules:
1. Only report known, documented drug interactions
2. severity should be "high" for dangerous, "moderate" for caution needed, "low" for minor
3. If no interactions found, return empty interactions array and safe: true
4. Be conservative - when unsure, recommend consulting a doctor
5. Include common food/activity interactions if relevant (e.g., grapefruit, alcohol)

Return ONLY the JSON, no other text."""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,  # Low temperature for accuracy
                "maxOutputTokens": 1024
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        result = response.json()
        
        if 'candidates' not in result:
            return {'success': False, 'error': 'AI analysis failed'}
        
        text = result['candidates'][0]['content']['parts'][0]['text']
        
        # Clean the response - remove markdown code blocks
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
        
        # Parse JSON
        data = json.loads(text)
        
        # Add disclaimer
        data['disclaimer'] = True
        
        return {'success': True, 'data': data}
        
    except json.JSONDecodeError as e:
        return {
            'success': True,
            'data': {
                'interactions': [],
                'safe': True,
                'summary': 'Could not analyze interactions. Please consult your doctor or pharmacist.',
                'disclaimer': True
            }
        }
    except Exception as e:
        return {'success': False, 'error': f'Analysis failed: {str(e)}'}


@interactions.route('/quick-check', methods=['POST'])
@login_required
def quick_check():
    """
    Quick check when adding a new medication
    Checks the new med against all existing meds
    """
    try:
        data = request.get_json()
        new_medication = data.get('medication', '')
        
        if not new_medication:
            return jsonify({'success': False, 'error': 'No medication provided'})
        
        # Get user's existing medications
        from app.models.medication import Medication
        
        existing_meds = Medication.query.filter_by(user_id=current_user.id).all()
        existing_names = [med.name for med in existing_meds]
        
        if not existing_names:
            return jsonify({
                'success': True,
                'data': {
                    'interactions': [],
                    'safe': True,
                    'summary': 'This is your first medication. No interactions to check.',
                    'disclaimer': False
                }
            })
        
        # Check new med against all existing
        all_meds = existing_names + [new_medication]
        result = check_interactions_with_gemini(all_meds)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
