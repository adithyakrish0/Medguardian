import os
import base64
import io
import json
from datetime import datetime, date
import numpy as np
import cv2
import logging
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
# Vision V2.0 Integration
from app.vision.vision_v2 import vision_v2
from flask import Response
from app import csrf, limiter  # For CSRF and rate limit exemption on API endpoints

logger = logging.getLogger(__name__)

medication = Blueprint('medication', __name__)

# List all medications for the logged-in user
@medication.route('/medications')
@login_required
def list_medications():
    """Display all medications for the current user"""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('medication/list.html', medications=medications)

# Add a new medication
@medication.route('/add-medication', methods=['GET', 'POST'])
@login_required
def add_medication():
    """Add a new medication"""
    from datetime import date, datetime
    
    if request.method == 'POST':
        # Process custom times
        # Process custom times
        custom_times = []
        
        # DEBUG: Log all form keys to debug custom time issue
        logger.info(f"📝 Form submission keys: {list(request.form.keys())}")
        
        # Try standard array format first
        if 'custom_time[]' in request.form:
            custom_times = request.form.getlist('custom_time[]')
        # Fallback to plain name (sometimes frameworks strip brackets)
        elif 'custom_time' in request.form:
            custom_times = request.form.getlist('custom_time')
            
        # Clean and filter times
        custom_times = [t.strip() for t in custom_times if t and t.strip()]
        logger.info(f"📝 Final custom_times list: {custom_times}")
        
        # DEBUG: Log what we received
        logger.info(f"📝 Creating medication - custom_time[] in form: {'custom_time[]' in request.form}")
        logger.info(f"📝 custom_times received: {custom_times}")
        
        # Create custom reminder times JSON
        custom_reminder_times = json.dumps(custom_times) if custom_times else None
        
        # Handle dates
        start_date_str = request.form.get('start_date')
        end_date_str = request.form.get('end_date')
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else date.today()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        # Handle AI training data
        reference_images = request.form.get('reference_images', '')
        background_image = request.form.get('background_image', '')  # Background for subtraction
        ai_trained = request.form.get('ai_trained', 'false') == 'true'
        
        new_medication = Medication(
            name=request.form.get('name'),
            dosage=request.form.get('dosage'),
            frequency=request.form.get('frequency'),
            instructions=request.form.get('instructions'),
            user_id=current_user.id,
            morning='morning' in request.form,
            afternoon='afternoon' in request.form,
            evening='evening' in request.form,
            night='night' in request.form,
            custom_reminder_times=custom_reminder_times,
            start_date=start_date,
            end_date=end_date,
            priority=request.form.get('priority', 'medium'),
            # AI Training data
            reference_images=reference_images if reference_images else None,
            background_image=background_image if background_image else None,
            ai_trained=ai_trained
        )
        db.session.add(new_medication)
        db.session.commit()
        
        # Check if AJAX request (for camera modal integration)
        if request.headers.get('Accept') == 'application/json' or request.is_json:
            return jsonify({
                'success': True,
                'medication_id': new_medication.id,
                'medication_name': new_medication.name,
                'redirect_url': url_for('medication.list_medications')
            })
        
        # Regular form submission
        flash('Medication added successfully!', 'success')
        return redirect(url_for('medication.list_medications'))
    
    return render_template('medication/add.html', today=date.today())

# Edit medication
@medication.route('/edit-medication/<int:medication_id>', methods=['GET', 'POST'])
@login_required
def edit_medication(medication_id):
    """Edit an existing medication"""
    medication = Medication.query.get_or_404(medication_id)
    
    # Security check
    if medication.user_id != current_user.id:
        flash('Unauthorized access', 'danger')
        return redirect(url_for('medication.list_medications'))
    
    if request.method == 'POST':
        try:
            # Process custom times
            custom_times = []
            if 'custom_time[]' in request.form:
                custom_times = [time for time in request.form.getlist('custom_time[]') if time.strip()]
            
            # Create custom reminder times JSON
            custom_reminder_times = json.dumps(custom_times) if custom_times else None
            
            # Handle dates
            start_date_str = request.form.get('start_date')
            end_date_str = request.form.get('end_date')
            
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else date.today()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

            medication.name = request.form.get('name')
            medication.dosage = request.form.get('dosage')
            # Use submitted frequency, or keep existing, or default to 'Custom'
            new_frequency = request.form.get('frequency')
            if new_frequency:
                medication.frequency = new_frequency
            elif not medication.frequency:
                medication.frequency = 'Custom'
            medication.instructions = request.form.get('instructions')
            medication.morning = 'morning' in request.form
            medication.afternoon = 'afternoon' in request.form
            medication.evening = 'evening' in request.form
            medication.night = 'night' in request.form
            
            # Update new fields
            medication.start_date = start_date
            medication.end_date = end_date
            medication.priority = request.form.get('priority', 'medium')
            medication.custom_reminder_times = custom_reminder_times
            
            db.session.commit()
            flash('Medication updated successfully!', 'success')
            return redirect(url_for('medication.list_medications'))
        except Exception as e:
            import traceback
            print(f"[EDIT ERROR] Exception: {e}")
            print(f"[EDIT ERROR] Traceback: {traceback.format_exc()}")
            db.session.rollback()
            flash(f'Error updating medication: {str(e)}', 'danger')
            return redirect(url_for('medication.edit_medication', medication_id=medication_id))
    
    return render_template('medication/edit.html', medication=medication)

# Delete medication
@medication.route('/delete-medication/<int:medication_id>', methods=['POST'])
@login_required
def delete_medication(medication_id):
    """Delete a medication and all related logs"""
    medication_obj = Medication.query.get_or_404(medication_id)
    
    # Security check
    if medication_obj.user_id != current_user.id:
        flash('Unauthorized access', 'danger')
        return redirect(url_for('medication.list_medications'))
    
    # Delete related logs first to avoid NOT NULL constraint violation
    MedicationLog.query.filter_by(medication_id=medication_id).delete()
    
    db.session.delete(medication_obj)
    db.session.commit()
    flash('Medication deleted successfully', 'success')
    return redirect(url_for('medication.list_medications'))

@medication.route('/verification')
@login_required
def verification():
    """Display medication verification page with real-time feedback"""
    from app.models.medication import Medication
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('medication/verification_v2.html', medications=medications)

# Video feed for camera
@medication.route('/video_feed')
@login_required
def video_feed():
    """Video streaming route for camera feed"""
    try:
        verifier = EnhancedMedicationVerifier()
        return Response(
            verifier.generate_frames(),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
    except Exception as e:
        print(f"Video feed error: {e}")
        return Response("Camera unavailable", status=503)

@medication.route('/verify-medication/<int:medication_id>', methods=['POST'])
@login_required
def verify_medication(medication_id):
    """Verify medication using uploaded image"""
    try:
        from app.services import verification_service
        
        if 'image' not in request.files:
            # Handle base64 from JSON as well (common in your JS)
            data = request.get_json()
            if data and 'image' in data:
                result = verification_service.verify_with_image(data['image'], medication_id)
                return jsonify(result)
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        # Read file to base64
        image_data = base64.b64encode(file.read()).decode('utf-8')
        
        result = verification_service.verify_with_image(image_data, medication_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Real-time verification endpoint
@medication.route('/realtime-verification')
@login_required
def realtime_verification():
    """Get real-time verification status"""
    try:
        verifier = EnhancedMedicationVerifier()
        result = verifier.get_last_detection_result()
        return jsonify(result if result else {'success': False, 'message': 'No detection yet'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Mark medication as taken
@medication.route('/mark-taken/<int:medication_id>', methods=['POST'])
@login_required
def mark_taken(medication_id):
    """Mark a medication as taken"""
    try:
        medication = Medication.query.get_or_404(medication_id)
        
        # Security check
        if medication.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Create log entry
        from datetime import datetime
        
        # Parse scheduled_time if provided as ISO string
        scheduled_time = datetime.now()
        if request.json and request.json.get('scheduled_time'):
            try:
                # Parse ISO format: '2025-12-06T16:11:49.594Z'
                scheduled_time_str = request.json.get('scheduled_time')
                logger.info(f"🔵 Received scheduled_time string: {scheduled_time_str}")
                scheduled_time = datetime.fromisoformat(scheduled_time_str.replace('Z', '+00:00'))
                logger.info(f"🔵 Parsed scheduled_time: {scheduled_time}")
            except (ValueError, AttributeError) as e:
                logger.error(f"❌ Failed to parse scheduled_time: {e}")
                scheduled_time = datetime.now()
        
        logger.info(f"🔵 Creating log: med_id={medication_id}, user_id={current_user.id}, scheduled={scheduled_time}")
        
        log = MedicationLog(
            user_id=current_user.id,
            medication_id=medication_id,
            taken_at=datetime.now(),
            scheduled_time=scheduled_time,
            taken_correctly=True,
            verified_by_camera=request.json.get('verified_by_camera', False) if request.json else False
        )
        
        db.session.add(log)
        db.session.commit()
        
        logger.info(f"✅ Log created with ID: {log.id}, scheduled_time={log.scheduled_time}")
        
        return jsonify({'success': True, 'message': 'Medication marked as taken'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# Skip medication dose
@medication.route('/skip-dose/<int:medication_id>', methods=['POST'])
@login_required
def skip_dose(medication_id):
    """Mark a medication dose as skipped"""
    try:
        medication_obj = Medication.query.get_or_404(medication_id)
        
        # Security check
        if medication_obj.user_id != current_user.id:
            if request.is_json:
                return jsonify({'error': 'Unauthorized'}), 403
            flash('Unauthorized access', 'danger')
            return redirect(url_for('main.dashboard'))
        
        # Parse scheduled_time from form or JSON
        scheduled_time = datetime.now()
        if request.is_json and request.json.get('scheduled_time'):
            try:
                scheduled_time_str = request.json.get('scheduled_time')
                scheduled_time = datetime.fromisoformat(scheduled_time_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                scheduled_time = datetime.now()
        
        logger.info(f"🔵 Skipping dose: med_id={medication_id}, user_id={current_user.id}")
        
        log = MedicationLog(
            user_id=current_user.id,
            medication_id=medication_id,
            taken_at=datetime.now(),
            scheduled_time=scheduled_time,
            taken_correctly=False,  # False indicates not taken/skipped
            verified_by_camera=False,
            notes="Skipped by user"
        )
        
        db.session.add(log)
        db.session.commit()
        
        # Return JSON for API calls, redirect for form submissions
        if request.is_json:
            return jsonify({'success': True, 'message': 'Medication skipped'})
        else:
            flash('Dose skipped successfully', 'info')
            return redirect(url_for('main.dashboard'))
        
    except Exception as e:
        logger.error(f"Error skipping dose: {e}")
        if request.is_json:
            return jsonify({'error': str(e)}), 500
        flash(f'Error skipping dose: {str(e)}', 'danger')
        return redirect(url_for('main.dashboard'))


# ========== NEW VERIFICATION ROUTES ==========

@medication.route('/verify-realtime', methods=['POST'])
@limiter.exempt  # Exempt from rate limiting - needs rapid calls
@csrf.exempt  # Exempt from CSRF for API calls
@login_required
def verify_realtime():
    """
    Real-time verification endpoint
    Receives image frame + expected medication, returns CORRECT/WRONG + detection overlay data
    """
    from app.vision.barcode_scanner import BarcodeScanner
    
    try:
        # Force JSON parsing even if content-type is wrong
        data = request.get_json(force=True, silent=True)
        
        if not data:
            logger.error(f"verify-realtime: No JSON data received. Content-Type: {request.content_type}")
            return jsonify({
                'error': 'No JSON data received',
                'detections': [],
                'detection_count': 0
            }), 400
        
        # Get image from base64
        image_data = data.get('image')
        zone_image_data = data.get('zone_image')  # NEW: cropped zone image
        zone_only = data.get('zone_only', False)  # NEW: prioritize zone-based verification
        expected_med_id = data.get('medication_id')
        
        if not image_data:
            return jsonify({
                'error': 'Missing image data',
                'detections': [],
                'detection_count': 0
            }), 400
            
        if not expected_med_id:
            return jsonify({
                'error': 'Missing medication_id',
                'detections': [],
                'detection_count': 0
            }), 400
        
        # Decode main image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Decode ZONE image if provided (for AI matching)
        zone_image = None
        if zone_image_data:
            try:
                zone_bytes = base64.b64decode(zone_image_data.split(',')[1])
                zone_nparr = np.frombuffer(zone_bytes, np.uint8)
                zone_image = cv2.imdecode(zone_nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"Zone image decode failed: {e}")
        
        # Get image dimensions for overlay scaling
        img_height, img_width = image.shape[:2]
        
        # Scan for barcode (always useful)
        barcodes = BarcodeScanner.scan_barcodes(zone_image if zone_image is not None else image)
        scanned_barcode = barcodes[0]['data'] if barcodes else None
        
        # ===== TRIPLE-LAYER VERIFICATION V2.0 =====
        from app.vision.vision_v2 import vision_v2
        
        # Get expected fingerprints from DB
        medication = Medication.query.get(expected_med_id)
        
        # Layer 2: ORB Features
        expected_des = None
        if medication and medication.visual_fingerprint:
            try:
                des_bytes = base64.b64decode(medication.visual_fingerprint)
                expected_des = np.frombuffer(des_bytes, np.uint8).reshape(-1, 32)
            except Exception as e:
                logger.error(f"Failed to decode ORB fingerprint: {e}")
        
        # Layer 3: Color Histogram
        reference_histogram = None
        if medication and medication.histogram_fingerprint:
            try:
                reference_histogram = vision_v2.decode_histogram_fingerprint(
                    medication.histogram_fingerprint
                )
            except Exception as e:
                logger.error(f"Failed to decode histogram fingerprint: {e}")

        # Layer 4: Deep Embedding (Multi-Angle Robustness)
        reference_embeddings = None
        if medication and medication.embedding_data:
            try:
                reference_embeddings = json.loads(medication.embedding_data)
                # Ensure it's a list of lists
                if reference_embeddings and not isinstance(reference_embeddings[0], list):
                    reference_embeddings = [reference_embeddings]
            except Exception as e:
                logger.error(f"Failed to parse embedding data: {e}")

        # Process frame via Quad-Layer Engine (Multi-Angle)
        result = vision_v2.process_frame(
            image_data, 
            expected_features=expected_des,
            reference_histogram=reference_histogram,
            reference_embedding=reference_embeddings # Now passing the full list
        )
        
        # Add metadata for frontend
        result['image_width'] = img_width
        result['image_height'] = img_height
        result['verified'] = result.get('is_verified', False)
        result['correct_medication'] = result.get('is_verified', False)
        result['detection_count'] = len(result.get('detections', []))
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"verify-realtime error: {e}")
        return jsonify({'error': str(e), 'detections': [], 'detection_count': 0}), 500


@medication.route('/detect-objects', methods=['POST'])
@limiter.exempt  # Exempt from rate limiting - needs rapid calls
@csrf.exempt  # Exempt from CSRF for API calls
@login_required
def detect_objects():
    """
    Simple object detection endpoint for training capture overlay.
    Returns bounding boxes without full medication verification.
    """
    from app.vision.vision_v2 import vision_v2
    
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'detections': [], 'error': 'No image provided'}), 400
        
        # Process via Vision Engine V2 (detection only)
        result = vision_v2.process_frame(image_data, expected_features=None)
        
        return jsonify({
            'success': True,
            'detections': result.get('detections', []),
            'count': len(result.get('detections', []))
        })
        
    except Exception as e:
        logger.error(f"detect-objects error: {e}")
        return jsonify({'detections': [], 'error': str(e)}), 500


@medication.route('/save-reference-image/<int:medication_id>', methods=['POST'])
@login_required
def save_reference_image(medication_id):
    """
    Save reference image for a medication (for visual verification).
    Now properly populates BOTH legacy (histogram) AND EfficientNet (embeddings) fields.
    Supports multi-angle training - call multiple times to add more angles.
    """
    from app.vision.visual_verifier import visual_verifier
    
    try:
        data = request.get_json()
        image_data = data.get('image')
        is_background = data.get('is_background', False)  # Optional: capture background only
        append_mode = data.get('append', True)  # Add to existing images or replace?
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get medication
        medication = Medication.query.filter_by(
            id=medication_id,
            user_id=current_user.id
        ).first_or_404()
        
        # Decode image for OpenCV processing
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # === BACKGROUND IMAGE MODE ===
        if is_background:
            # Store background-only image for subtraction during verification
            medication.background_image = image_data
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Background image saved for subtraction',
                'type': 'background'
            })
        
        # === REFERENCE IMAGE MODE ===
        
        # 1. Save physical file (legacy - for display purposes)
        image_path = visual_verifier.save_reference_image(image, medication_id)
        
        # 2. Extract legacy features (histogram-based)
        features = visual_verifier.extract_features(image)
        
        # 3. Extract text via OCR
        label_text = visual_verifier.extract_text_ocr(image)
        
        # 4. Store base64 for EfficientNet (THE KEY FIX!)
        # Parse existing reference_images or start fresh
        existing_images = []
        if append_mode and medication.reference_images:
            try:
                existing_images = json.loads(medication.reference_images)
            except:
                existing_images = []
        
        # Add new image (keep original base64, not re-encoded)
        existing_images.append(image_data)
        
        # Limit to 5 angles max to prevent DB bloat
        MAX_ANGLES = 5
        if len(existing_images) > MAX_ANGLES:
            existing_images = existing_images[-MAX_ANGLES:]  # Keep latest 5
        
        # 5. Extract Visual Fingerprints for Triple-Layer Verification
        from app.vision.vision_v2 import vision_v2
        
        # Layer 2: ORB Feature Fingerprint
        orb_fingerprint = vision_v2.get_fingerprint(image_data)
        if orb_fingerprint:
            medication.visual_fingerprint = orb_fingerprint
            logger.info(f"Saved Layer 2 (ORB) fingerprint for medication {medication_id}")
        
        # Layer 3: Color Histogram Fingerprint
        histogram_fingerprint = vision_v2.get_histogram_fingerprint(image_data)
        if histogram_fingerprint:
            medication.histogram_fingerprint = histogram_fingerprint
            logger.info(f"Saved Layer 3 (Histogram) fingerprint for medication {medication_id}")

        # Layer 4: Deep Embedding Fingerprint (Personalized AI)
        embedding = vision_v2.get_embedding_fingerprint(image_data)
        if embedding:
            # Load existing embeddings or start new list
            existing_embeddings = []
            if medication.embedding_data:
                try:
                    existing_embeddings = json.loads(medication.embedding_data)
                    # If it's a legacy flat list, convert to list of lists
                    if existing_embeddings and not isinstance(existing_embeddings[0], list):
                        existing_embeddings = [existing_embeddings]
                except:
                    existing_embeddings = []
            
            existing_embeddings.append(embedding)
            # Limit to latest 5 embeddings
            if len(existing_embeddings) > 5:
                existing_embeddings = existing_embeddings[-5:]
                
            medication.embedding_data = json.dumps(existing_embeddings)
            logger.info(f"Saved Layer 4 (Deep Embedding) angle {len(existing_embeddings)} for medication {medication_id}")

        # 6. Update ALL fields
        medication.reference_image_path = image_path
        medication.image_features = json.dumps(features)
        medication.label_text = label_text
        medication.reference_images = json.dumps(existing_images)  # For EfficientNet!
        medication.ai_trained = True  # Mark as trained!
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Reference image saved ({len(existing_images)} angle{"s" if len(existing_images) > 1 else ""})',
            'features_extracted': True,
            'ocr_text': label_text[:100] if label_text else 'None',
            'total_angles': len(existing_images),
            'ai_trained': True
        })
        
    except Exception as e:
        logger.error(f"save-reference-image error: {e}")
        return jsonify({'error': str(e)}), 500


@medication.route('/clear-training/<int:medication_id>', methods=['POST'])
@login_required
def clear_training(medication_id):
    """Clear all AI training data for a medication (for re-training)"""
    try:
        medication = Medication.query.filter_by(
            id=medication_id,
            user_id=current_user.id
        ).first_or_404()
        
        medication.reference_images = None
        medication.background_image = None
        medication.image_features = None
        medication.label_text = None
        medication.visual_fingerprint = None  # Clear Layer 2
        medication.histogram_fingerprint = None  # Clear Layer 3
        medication.ai_trained = False
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'AI training data cleared. You can now re-train.'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@medication.route('/next-expected')
@login_required
def next_expected():
    """Get the next expected medication for verification"""
    from app.utils.medication_verification import get_next_expected_medication
    
    try:
        next_med = get_next_expected_medication(current_user.id)
        
        if next_med:
            return jsonify({'success': True, 'medication': next_med})
        else:
            return jsonify({'success': False, 'message': 'No medications scheduled'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Medication history and export routes
@medication.route('/history')
@login_required
def medication_history():
    """View medication history"""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    logs = MedicationLog.query.filter_by(user_id=current_user.id).order_by(
        MedicationLog.taken_at.desc()
    ).limit(100).all()
    
    return render_template('medication/history.html',
                         medications=medications,
                         logs=logs)

@medication.route('/export-history/<format>')
@login_required
def export_history(format):
    """Export medication history"""
    from app.utils.export import export_to_csv, export_to_pdf
    
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    logs = MedicationLog.query.filter_by(user_id=current_user.id).order_by(
        MedicationLog.taken_at.desc()
    ).all()
    
    if format == 'csv':
        return export_to_csv(logs, medications)
    elif format == 'pdf':
        return export_to_pdf(logs, medications, current_user)
    else:
        flash('Invalid export format', 'error')
        return redirect(url_for('medication.medication_history'))

@medication.route('/log-details/<int:log_id>')
@login_required
def log_details(log_id):
    """Get details for a specific log"""
    log = MedicationLog.query.get_or_404(log_id)
    
    # Security check
    if log.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify({
        'medication_name': log.medication.name,
        'dosage': log.medication.dosage,
        'scheduled_time': log.scheduled_time.strftime('%I:%M %p') if log.scheduled_time else 'N/A',
        'taken_at': log.taken_at.strftime('%B %d, %Y %I:%M %p'),
        'status': 'Taken correctly' if log.taken_correctly else 'Missed',
        'verified_by_camera': log.verified_by_camera,
        'notes': log.notes or 'No notes'
    })


@medication.route('/medication-reminder/<int:medication_id>')
@login_required
def medication_reminder_page(medication_id):
    """Dedicated full-page medication reminder"""
    from datetime import datetime
    
    medication = Medication.query.get_or_404(medication_id)
    
    # Security check
    if medication.user_id != current_user.id:
        flash('Unauthorized access', 'danger')
        return redirect(url_for('main.dashboard'))
    
    # Get scheduled time from query param
    scheduled_time = request.args.get('time', datetime.now().isoformat())
    
    # Parse for display
    try:
        scheduled_dt = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
        scheduled_time_display = scheduled_dt.strftime('%I:%M %p')
    except:
        scheduled_time_display = 'Now'
    
    logger.info(f"🔔 Reminder page opened: {medication.name} for user {current_user.id}")
    
    return render_template(
        'medication/reminder_page.html',
        medication=medication,
        scheduled_time=scheduled_time,
        scheduled_time_display=scheduled_time_display
    )


@medication.route('/api/check-due-reminders')
@login_required
def check_due_reminders():
    """
    API endpoint for client-side polling to check for due medication reminders.
    Returns the first medication that is due and hasn't been taken.
    Used as a fallback when SocketIO push isn't working.
    """
    from datetime import datetime, timedelta
    from app.utils.scheduler import get_scheduled_times
    
    now = datetime.now()
    user_id = current_user.id
    
    # Get all active medications for this user
    medications = Medication.query.filter_by(user_id=user_id).all()
    
    for med in medications:
        # Get scheduled times for today
        scheduled_times = get_scheduled_times(med, now.date())
        
        for scheduled_time in scheduled_times:
            # Calculate difference in minutes
            diff_minutes = (scheduled_time - now).total_seconds() / 60
            
            # Check if within window: past 5 mins to future 1 min
            if -5 <= diff_minutes <= 1:
                # 1. CHECK SNOOZE FIRST
                # If there is an active snooze for this medication, IGNORE the due status
                from app.models.snooze_log import SnoozeLog
                active_snooze = SnoozeLog.query.filter(
                    SnoozeLog.medication_id == med.id,
                    SnoozeLog.user_id == user_id,
                    SnoozeLog.snooze_until > now  # Use local time consistently
                ).first()
                if active_snooze:
                    continue  # Skip this medication, it is snoozed!

                # Check if already taken OR skipped today for this scheduled time
                today_start = datetime.combine(now.date(), datetime.min.time())
                today_end = datetime.combine(now.date(), datetime.max.time())
                
                # Check for ANY log entry (taken correctly OR skipped)
                log = MedicationLog.query.filter_by(
                    medication_id=med.id,
                    user_id=user_id
                ).filter(
                    MedicationLog.taken_at >= today_start,
                    MedicationLog.taken_at <= today_end
                ).first()
                
                if not log:
                    # This medication is DUE and not taken/skipped!
                    return jsonify({
                        'due': True,
                        'medication_id': med.id,
                        'medication_name': med.name,
                        'dosage': med.dosage,
                        'scheduled_time': scheduled_time.isoformat(),
                        'scheduled_time_display': scheduled_time.strftime('%I:%M %p'),
                        'instructions': med.instructions,
                        'priority': med.priority,
                        'redirect_url': f'/medication/medication-reminder/{med.id}?time={scheduled_time.isoformat()}'
                    })
    
    # No medications due
    return jsonify({'due': False})
