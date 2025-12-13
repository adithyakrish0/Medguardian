# app/routes/prescription.py
"""
Prescription Scanner routes
Uses Gemini AI to extract medication info from prescription photos
"""
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
import base64

prescription = Blueprint('prescription', __name__)

@prescription.route('/')
@login_required
def scanner():
    """Prescription scanner page"""
    return render_template('prescription/scanner.html')

@prescription.route('/scan', methods=['POST'])
@login_required
def scan():
    """
    Scan prescription image and extract medications
    Accepts: base64 image data
    Returns: extracted medication data
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'})
        
        # Get base64 image data (remove data:image/jpeg;base64, prefix if present)
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Import gemini service (lazy import to avoid startup issues)
        from app.services.gemini_service import gemini_service
        
        if not gemini_service.is_configured():
            return jsonify({
                'success': False, 
                'error': 'Gemini API not configured. Please add GEMINI_API_KEY to .env'
            })
        
        # Extract prescription data
        result = gemini_service.extract_prescription_data(image_data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@prescription.route('/add-from-scan', methods=['POST'])
@login_required
def add_from_scan():
    """
    Add medications from scanned prescription data
    """
    try:
        from app.extensions import db
        from app.models.medication import Medication
        from datetime import date
        
        data = request.get_json()
        medications = data.get('medications', [])
        
        if not medications:
            return jsonify({'success': False, 'error': 'No medications provided'})
        
        added = []
        skipped = []
        
        for med in medications:
            med_name = med.get('name', '').strip()
            
            # Validate medication name
            if not med_name or len(med_name) < 2:
                continue
            
            # Check if medication already exists
            existing = Medication.query.filter_by(
                user_id=current_user.id,
                name=med_name
            ).first()
            
            if existing:
                skipped.append(med_name)
                continue
            
            # Create new medication with start_date
            new_med = Medication(
                user_id=current_user.id,
                name=med_name,
                dosage=med.get('dosage', '').strip() or 'As prescribed',
                instructions=med.get('instructions', '').strip(),
                start_date=date.today(),
                # Set default schedule based on frequency
                morning='morning' in med.get('frequency', '').lower(),
                afternoon='afternoon' in med.get('frequency', '').lower() or 'noon' in med.get('frequency', '').lower(),
                evening='evening' in med.get('frequency', '').lower(),
                night='night' in med.get('frequency', '').lower() or 'bed' in med.get('frequency', '').lower()
            )
            
            # Parse frequency for schedule
            freq = med.get('frequency', '').lower()
            if 'twice' in freq or '2 times' in freq or 'bd' in freq or 'bid' in freq:
                new_med.morning = True
                new_med.evening = True
                new_med.frequency = 'Twice daily'
            elif 'three' in freq or '3 times' in freq or 'thrice' in freq or 'tds' in freq or 'tid' in freq:
                new_med.morning = True
                new_med.afternoon = True
                new_med.evening = True
                new_med.frequency = 'Three times daily'
            elif 'four' in freq or '4 times' in freq or 'qid' in freq:
                new_med.morning = True
                new_med.afternoon = True
                new_med.evening = True
                new_med.night = True
                new_med.frequency = 'Four times daily'
            elif 'daily' in freq or 'once' in freq or 'od' in freq:
                new_med.morning = True
                new_med.frequency = 'Once daily'
            elif 'night' in freq or 'hs' in freq or 'bedtime' in freq:
                new_med.night = True
                new_med.frequency = 'At night'
            else:
                # Default to once daily if no schedule determined
                new_med.morning = True
                new_med.frequency = med.get('frequency', 'As directed') or 'As directed'
            
            db.session.add(new_med)
            added.append(med_name)
        
        db.session.commit()
        
        message = f"Added {len(added)} medication(s)"
        if skipped:
            message += f". Skipped {len(skipped)} (already exist)"
        
        return jsonify({
            'success': True,
            'added': added,
            'skipped': skipped,
            'count': len(added),
            'message': message
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Failed to add medications: {str(e)}'})

