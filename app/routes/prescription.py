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
    Scan prescription image and extract medications.
    Pipeline: Gemini OCR → BioBERT NER validation & enrichment.
    """
    try:
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image provided'})

        # Get base64 image data (remove data:image/jpeg;base64, prefix if present)
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        # ── Stage 1: Gemini OCR ──────────────────────────────────
        from app.services.gemini_service import gemini_service

        if not gemini_service.is_configured():
            return jsonify({
                'success': False,
                'error': 'Gemini API not configured. Please add GEMINI_API_KEY to .env'
            })

        result = gemini_service.extract_prescription_data(image_data)

        if not result.get('success'):
            return jsonify(result)

        # ── Stage 2: NER validation & enrichment ─────────────────
        try:
            from backend.ml.medication_ner import medication_ner

            gemini_data = result.get('data', {})
            medications = gemini_data.get('medications', [])
            notes = gemini_data.get('notes', '')

            # Build a combined text block from all name fields + notes
            name_texts = [med.get('name', '') for med in medications]
            combined_text = '. '.join(name_texts)
            if notes:
                combined_text += '. ' + notes

            # Run NER over the combined text
            ner_entities = medication_ner.extract_medications(combined_text)
            ner_names = {ent['text'].lower() for ent in ner_entities}

            # Validate each Gemini medication against NER results
            for med in medications:
                med_name = med.get('name', '').strip()
                med_name_lower = med_name.lower()

                # Check if NER confirms this is a real medication
                matched = any(
                    ner_name in med_name_lower or med_name_lower in ner_name
                    for ner_name in ner_names
                )

                if matched:
                    # Find the best matching NER entity for confidence
                    best_conf = max(
                        (ent['confidence'] for ent in ner_entities
                         if ent['text'].lower() in med_name_lower
                         or med_name_lower in ent['text'].lower()),
                        default=0.0,
                    )
                    med['ner_validated'] = True
                    med['ner_confidence'] = round(best_conf, 4)
                else:
                    med['ner_validated'] = False
                    med['ner_confidence'] = 0.0

            # Check if NER found medications that Gemini missed
            gemini_names = {m.get('name', '').lower() for m in medications}
            for ent in ner_entities:
                ent_lower = ent['text'].lower()
                already_found = any(
                    ent_lower in gn or gn in ent_lower
                    for gn in gemini_names
                )
                if not already_found and ent['confidence'] > 0.7:
                    medications.append({
                        'name': ent['text'],
                        'dosage': '',
                        'frequency': '',
                        'instructions': '',
                        'ner_validated': True,
                        'ner_confidence': round(ent['confidence'], 4),
                        'source': 'ner_only',
                    })

            gemini_data['medications'] = medications

            # Include raw NER entities for transparency
            result['ner_entities'] = [
                {'text': e['text'], 'confidence': round(e['confidence'], 4), 'label': e['label']}
                for e in ner_entities
            ]

        except Exception as ner_err:
            # NER failure is non-fatal — return Gemini results with a warning
            import logging
            logging.getLogger(__name__).warning("NER post-processing failed: %s", ner_err)
            result['ner_warning'] = f"NER validation unavailable: {ner_err}"

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
        from flask import current_app
        import traceback
        current_app.logger.error(f"Failed to add medications: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': f'Failed to add medications: {str(e)}'})

