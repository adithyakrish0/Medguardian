from flask import Blueprint, request, Response, jsonify
from flask_login import login_required
from app.services.tts_service import get_tts_service
import logging

logger = logging.getLogger(__name__)
tts_bp = Blueprint('tts', __name__)

@tts_bp.route('/tts/synthesize', methods=['POST', 'OPTIONS'])
@login_required
def synthesize():
    from flask import current_app
    current_app.logger.info(f"TTS Synthesize request received. Content-Type: {request.content_type}")
    try:
        data = request.get_json()
        current_app.logger.info(f"TTS Data: {data}")
    except Exception as e:
        current_app.logger.error(f"TTS JSON parse failed: {e}")
        return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
        
    text = data.get('text', '').strip()
    voice = data.get('voice', 'af_heart')
    speed = float(data.get('speed', 0.95))
    
    if not text:
        current_app.logger.warning("TTS failed: No text provided")
        return jsonify({'success': False, 'message': 'No text provided'}), 400
    
    if len(text) > 500:
        return jsonify({'success': False, 'message': 'Text too long'}), 400
    
    tts = get_tts_service()
    
    if not tts.available:
        return jsonify({'success': False, 'message': 'TTS not available'}), 503
    
    audio_bytes = tts.synthesize(text, voice=voice, speed=speed)
    
    if audio_bytes is None:
        return jsonify({'success': False, 'message': 'Synthesis failed'}), 500
    
    return Response(
        audio_bytes,
        mimetype='audio/wav',
        headers={
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-cache'
        }
    )

@tts_bp.route('/tts/status', methods=['GET', 'OPTIONS'])
@login_required
def tts_status():
    tts = get_tts_service()
    return jsonify({
        'success': True,
        'available': tts.available
    })
