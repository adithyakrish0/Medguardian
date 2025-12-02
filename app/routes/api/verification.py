"""API v1 - Verification endpoints"""
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1
from app.services import verification_service


@api_v1.route('/verify', methods=['POST'])
@login_required
def verify_medication():
    """Verify medication using image"""
    try:
        data = request.json
        
        if not data or 'image' not in data or 'medication_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: image, medication_id'
            }), 400
        
        result = verification_service.verify_with_image(
            image_data=data['image'],
            medication_id=data['medication_id']
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/medications/<int:medication_id>/reference-image', methods=['POST'])
@login_required
def save_reference_image(medication_id):
    """Save reference image for medication verification"""
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: image'
            }), 400
        
        # Generate save path
        import os
        from datetime import datetime
        save_dir = 'app/static/reference_images'
        os.makedirs(save_dir, exist_ok=True)
        
        filename = f"med_{medication_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        save_path = os.path.join(save_dir, filename)
        
        # Save image
        success = verification_service.save_reference_image(
            image_data=data['image'],
            medication_id=medication_id,
            save_path=save_path
        )
        
        if success:
            from app.services import MedicationService
            MedicationService.save_reference_image(
                medication_id,
                save_path
            )
            
            return jsonify({
                'success': True,
                'message': 'Reference image saved successfully',
                'path': save_path
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to save reference image'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
