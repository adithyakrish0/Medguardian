import os
import base64
import io
import json
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.vision.pill_detection import PillDetector
from app.vision.medication_verifier import MedicationVerifier

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
        flash('Medication added successfully!')
        return redirect(url_for('medication.list_medications'))
    return render_template('medication/add.html')

# Edit an existing medication
@medication.route('/edit-medication/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_medication(id):
    """Edit an existing medication"""
    medication_obj = Medication.query.get_or_404(id)
    if medication_obj.user_id != current_user.id:
        flash('You do not have permission to edit this medication.')
        return redirect(url_for('medication.list_medications'))

    if request.method == 'POST':
        medication_obj.name = request.form.get('name')
        medication_obj.dosage = request.form.get('dosage')
        medication_obj.frequency = request.form.get('frequency')
        medication_obj.instructions = request.form.get('instructions')
        medication_obj.morning = 'morning' in request.form
        medication_obj.afternoon = 'afternoon' in request.form
        medication_obj.evening = 'evening' in request.form
        medication_obj.night = 'night' in request.form
        
        # Process custom times
        custom_times = []
        if 'custom_time[]' in request.form:
            custom_times = [time for time in request.form.getlist('custom_time[]') if time.strip()]
        
        # Create custom reminder times JSON
        medication_obj.custom_reminder_times = json.dumps(custom_times) if custom_times else None
        
        db.session.commit()
        flash('Medication updated successfully!')
        return redirect(url_for('medication.list_medications'))

    return render_template('medication/edit.html', medication=medication_obj)

# Delete a medication
@medication.route('/delete-medication/<int:id>', methods=['POST'])
@login_required
def delete_medication(id):
    """Delete a medication"""
    medication_obj = Medication.query.get_or_404(id)
    if medication_obj.user_id != current_user.id:
        flash('You do not have permission to delete this medication.')
        return redirect(url_for('medication.list_medications'))
    
    db.session.delete(medication_obj)
    db.session.commit()
    flash('Medication deleted successfully!')
    return redirect(url_for('medication.list_medications'))

# Confirm a medication has been taken
@medication.route('/confirm-medication/<int:medication_id>', methods=['POST'])
@login_required
def confirm_medication(medication_id):
    """Confirm medication has been taken"""
    medication_obj = Medication.query.get_or_404(medication_id)
    if medication_obj.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Permission denied'}), 403

    log = MedicationLog(
        medication_id=medication_obj.id,
        user_id=current_user.id,
        taken_correctly=True,
        notes="User confirmed medication taken"
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Medication confirmed successfully!'})

# Compliance report
@medication.route('/compliance-report')
@login_required
def compliance_report():
    """Generate compliance report for the user"""
    logs = MedicationLog.query.filter_by(user_id=current_user.id).all()
    total_logs = len(logs)
    taken_logs = sum(1 for log in logs if log.taken_correctly)

    compliance_rate = (taken_logs / total_logs * 100) if total_logs > 0 else 0

    return render_template('medication/compliance_report.html', 
                         total_logs=total_logs,
                         taken_logs=taken_logs,
                         compliance_rate=compliance_rate)

# Medication verification
@medication.route('/verify-medication/<int:medication_id>', methods=['POST'])
@login_required
def verify_medication(medication_id):
    """Verify medication using camera or image upload"""
    medication_obj = Medication.query.get_or_404(medication_id)
    if medication_obj.user_id != current_user.id:
        return jsonify({
            'success': False,
            'message': "You don't have permission to verify this medication",
            'detected_bottles': 0,
            'barcode_verified': False
        }), 403

    result = {}
    
    try:
        # Handle uploaded image if present
        if 'image' in request.files:
            image_file = request.files['image']
            temp_path = os.path.join('temp', f"temp_{current_user.id}.jpg")
            os.makedirs('temp', exist_ok=True)
            image_file.save(temp_path)

            verifier = MedicationVerifier()
            result = verifier.verify_medication_with_image(temp_path, medication_id)
            verifier.cleanup()

            if os.path.exists(temp_path):
                os.remove(temp_path)
        else:
            # Default: use camera directly
            verifier = MedicationVerifier()
            result = verifier.verify_medication(medication_id)
            verifier.cleanup()
    except Exception as e:
        result = {'success': False, 'message': f'Verification failed: {str(e)}'}

    # Log verification attempt
    log = MedicationLog(
        medication_id=medication_id,
        user_id=current_user.id,
        taken_correctly=result.get('success', False),
        notes=result.get('message', 'Verification attempt')
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(result)

# Verification page
@medication.route('/verification')
@login_required
def verification():
    """Display medication verification page"""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('medication/verification.html', medications=medications)

# Realtime verification page
@medication.route('/realtime-verification')
@login_required
def realtime_verification():
    """Display realtime verification page"""
    medications = Medication.query.filter_by(user_id=current_user.id).all()
    return render_template('medication/realtime_verification.html', medications=medications)

# Detect pills endpoint
@medication.route('/detect-pills', methods=['POST'])
@login_required
def detect_pills():
    """Detect pills in uploaded image"""
    data = request.get_json()
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        # Remove data URL prefix
        if image_data.startswith('data:image/jpeg;base64,'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Convert to PIL Image
        from PIL import Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Detect pills
        detector = PillDetector()
        detections = detector.detect_pills(image)
        
        return jsonify({'detections': detections, 'count': len(detections)})
    except Exception as e:
        return jsonify({'error': f'Image processing failed: {str(e)}'}), 500
