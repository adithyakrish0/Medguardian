"""API v1 - User endpoints"""
from flask import jsonify, request
from flask_login import login_required, current_user
from . import api_v1


@api_v1.route('/users/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user profile"""
    try:
        return jsonify({
            'success': True,
            'data': current_user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_v1.route('/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    from app.vision.model_manager import model_manager
    
    model_info = model_manager.get_model_info()
    
    return jsonify({
        'status': 'healthy',
        'version': 'v1',
        'features': {
            'yolo_loaded': model_info['yolo_loaded'],
            'tesseract_available': model_info['tesseract_available'],
            'device': model_info['device']
        }
    }), 200
