"""
Model Manager - Singleton pattern for AI model loading
Ensures YOLO and other heavy models are loaded only once
"""
try:
    import torch
except ImportError:
    torch = None
    print("⚠️ PyTorch not available - Vision features will be disabled")

import logging
from typing import Optional
from threading import Lock

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton manager for AI models to prevent redundant loading"""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize model manager (only once)"""
        if self._initialized:
            return
        
        self._yolo_model = None
        self._yolo_model_path = None
        self._tesseract_available = False
        self._initialized = True
        
        # Check Tesseract availability
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self._tesseract_available = True
            logger.info("Tesseract OCR is available")
        except Exception as e:
            logger.warning(f"Tesseract OCR not available: {e}")
    
    def get_yolo_model(self, model_path: str = 'yolov5s.pt', force_reload: bool = False):
        """
        Get YOLO model (loads once, cached thereafter)
        
        Args:
            model_path: Path to YOLO model weights
            force_reload: Force reload even if already cached
            
        Returns:
            Loaded YOLO model
        """
        # Return cached model if available and path matches
        if not force_reload and self._yolo_model is not None:
            if self._yolo_model_path == model_path:
                logger.debug("Using cached YOLO model")
                return self._yolo_model
        
        # Load model
        try:
            if torch is None:
                raise ImportError("PyTorch not available")
                
            logger.info(f"Loading YOLO model from {model_path}...")
            self._yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
            self._yolo_model_path = model_path
            logger.info("✓ YOLO model loaded successfully (cached for future use)")
            return self._yolo_model
            
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self._yolo_model = None
            self._yolo_model_path = None
            raise
    
    def is_model_loaded(self) -> bool:
        """Check if YOLO model is currently loaded"""
        return self._yolo_model is not None
    
    def is_tesseract_available(self) -> bool:
        """Check if Tesseract OCR is available"""
        return self._tesseract_available
    
    def unload_model(self):
        """Unload YOLO model to free memory (rarely needed)"""
        if self._yolo_model is not None:
            logger.info("Unloading YOLO model from memory")
            self._yolo_model = None
            self._yolo_model_path = None
            # Force garbage collection
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
    
    def get_model_info(self) -> dict:
        """Get information about loaded models"""
        return {
            'yolo_loaded': self._yolo_model is not None,
            'yolo_model_path': self._yolo_model_path,
            'tesseract_available': self._tesseract_available,
            'cuda_available': torch.cuda.is_available(),
            'device': 'cuda' if torch.cuda.is_available() else 'cpu'
        }


# Global singleton instance
model_manager = ModelManager()
