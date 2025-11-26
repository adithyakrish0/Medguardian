import os
import base64
import io
import json
import numpy as np
import cv2
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.vision.pill_detection import PillDetector
from app.vision.enhanced_verifier import EnhancedMedicationVerifier
from flask import Response

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
    if request.method == 'POST':
        # Process custom times
        custom_times = []
        if 'custom_time[]' in request.form:
            custom_times = [time for time in request.form.getlist('custom_time[]') if time.strip()]
        
        # Create custom reminder times JSON
        custom_reminder_times = json.dumps(custom_times) if custom_times else None
        
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
            custom_reminder_times=custom_reminder_times
        )
        db.session.add(new_medication)
        db.session.commit()
        flash('Medication added successfully!', 'success')
        return redirect(url_for('medication.list_medications'))
    
    return render_template('medication/add.html')

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
        medication.name = request.form.get('name')
        medication.dosage = request.form.get('dosage')
        medication.frequency = request.form.get('frequency')
        medication.instructions = request.form.get('instructions')
        medication.morning = 'morning' in request.form
        medication.afternoon = 'afternoon' in request.form
        medication.evening = 'evening' in request.form
        medication.night = 'night' in request.form
        
        db.session.commit()
        flash('Medication updated successfully!', 'success')
        return redirect(url_for('medication.list_medications'))
    
    return render_template('medication/edit.html', medication=medication)

# Delete medication
@medication.route('/delete-medication/<int:medication_id>', methods=['POST'])
@login_required
def delete_medication(medication_id):
    """Delete a medication"""
    medication = Medication.query.get_or_404(medication_id)
    
    # Security check
    if medication.user_id != current_user.id:
        flash('Unauthorized access', 'danger')
        return redirect(url_for('medication.list_medications'))
    
    db.session.delete(medication)
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

# Verify medication with image upload
@medication.route('/verify-medication/<int:medication_id>', methods=['POST'])
@login_required
def verify_medication(medication_id):
    """Verify medication using uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        # Save temporarily
        temp_path = os.path.join('temp', f'verify_{current_user.id}.jpg')
        os.makedirs('temp', exist_ok=True)
        file.save(temp_path)
        
        # Verify
        verifier = EnhancedMedicationVerifier()
        result = verifier.verify_medication_with_image(temp_path, medication_id)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
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
        log = MedicationLog(
            user_id=current_user.id,
            medication_id=medication_id,
            taken_at=datetime.now(),
            taken_correctly=True,
            verified_by_camera=request.json.get('verified_by_camera', False)
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Medication marked as taken'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========== NEW VERIFICATION ROUTES ==========

@medication.route('/verify-realtime', methods=['POST'])
@login_required
def verify_realtime():
    """
    Real-time verification endpoint
    Receives image frame + expected medication, returns CORRECT/WRONG
    """
    from app.utils.medication_verification import verify_medication_comprehensive
    from app.vision.barcode_scanner import MedicationBarcodeScanner
    
    try:
        data = request.get_json()
        
        # Get image from base64
        image_data = data.get('image')
        expected_med_id = data.get('medication_id')
        
        if not image_data or not expected_med_id:
            return jsonify({'error': 'Missing image or medication_id'}), 400
        
        # Decode image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Scan for barcode
        scanner = MedicationBarcodeScanner()
        barcodes = scanner.scan_barcode(image)
        scanned_barcode = barcodes[0]['data'] if barcodes else None
        
        # Comprehensive verification
        result = verify_medication_comprehensive(
            image=image,
            expected_medication_id=expected_med_id,
            user_id=current_user.id,
            scanned_barcode=scanned_barcode
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@medication.route('/save-reference-image/<int:medication_id>', methods=['POST'])
@login_required
def save_reference_image(medication_id):
    """
    Save reference image for a medication (for visual verification)
    Called when user first adds a medication
    """
    from app.vision.visual_verifier import visual_verifier
    
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get medication
        medication = Medication.query.filter_by(
            id=medication_id,
            user_id=current_user.id
        ).first_or_404()
        
        # Decode image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Save reference image
        image_path = visual_verifier.save_reference_image(image, medication_id)
        
        # Extract features
        features = visual_verifier.extract_features(image)
        
        # Extract text via OCR
        label_text = visual_verifier.extract_text_ocr(image)
        
        # Update medication
        medication.reference_image_path = image_path
        medication.image_features = json.dumps(features)
        medication.label_text = label_text
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Reference image saved',
            'features_extracted': True,
            'ocr_text': label_text[:100] if label_text else 'None'
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
