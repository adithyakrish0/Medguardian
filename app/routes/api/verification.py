"""API v1 - Verification endpoints"""
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1
from app.services import verification_service
from app import limiter  # For rate limit exemption on rapid-call endpoints


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


@api_v1.route('/detect-hand', methods=['POST', 'OPTIONS'])
@limiter.exempt  # Exempt from rate limiting - needs rapid calls
# Note: No @login_required - this endpoint only detects hands, doesn't access user data
def detect_hand():

    """
    Detect if a human hand is present in the camera frame.
    
    Uses YOLO for robust detection of hands in any position (open, closed, holding objects).
    This replaces client-side MediaPipe which requires open palms.
    """
    # Handle CORS preflight immediately
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3001')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200
    
    import traceback
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'hand_detected': False,
                'error': 'Missing required field: image'
            }), 400
        
        from app.vision.vision_v2 import vision_v2
        print(f"[DEBUG] Calling detect_hand, vision_available={vision_v2.vision_available}, hand_detector={'yes' if vision_v2.hand_detector else 'no'}")
        result = vision_v2.detect_hand(data['image'])
        print(f"[DEBUG] detect_hand result: {result}")
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[ERROR] detect_hand failed: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'hand_detected': False,
            'error': str(e)
        }), 500
