import os
import io
import logging
import numpy as np

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.model = None
        self.available = False
        self._load_model()
    
    def _load_model(self):
        try:
            from kokoro_onnx import Kokoro
            model_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'models', 'kokoro-v1.0.onnx')
            voices_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'models', 'voices-v1.0.bin')
            
            if not os.path.exists(model_path):
                logger.info("Kokoro model not found, downloading...")
                self._download_model(model_path, voices_path)
            
            self.model = Kokoro(model_path, voices_path)
            self.available = True
            logger.info("✅ Kokoro TTS loaded successfully")
        except Exception as e:
            logger.warning(f"Kokoro TTS not available: {e}. Will use fallback.")
            self.available = False
    
    def _download_model(self, model_path, voices_path):
        import urllib.request
        # Add User-Agent to avoid being blocked by GitHub/CDN
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
        urllib.request.install_opener(opener)

        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        model_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
        voices_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
        
        logger.info("Downloading Kokoro model (~310MB) with User-Agent...")
        urllib.request.urlretrieve(model_url, model_path)
        logger.info("Downloading voices file (~27MB)...")
        urllib.request.urlretrieve(voices_url, voices_path)
        logger.info("✅ Kokoro model downloaded")
    
    def synthesize(self, text: str, voice: str = "af_heart", speed: float = 1.0) -> bytes:
        """Synthesize text to WAV audio bytes"""
        if not self.available or self.model is None:
            return None
        
        try:
            # Limit text length for safety
            text = text[:500]
            samples, sample_rate = self.model.create(text, voice=voice, speed=speed)
            
            # Convert to WAV bytes
            import soundfile as sf
            buffer = io.BytesIO()
            sf.write(buffer, samples, sample_rate, format='WAV')
            buffer.seek(0)
            return buffer.read()
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            return None

# Singleton
_tts_instance = None

def get_tts_service():
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = TTSService()
    return _tts_instance
