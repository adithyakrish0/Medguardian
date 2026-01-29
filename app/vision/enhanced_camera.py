import cv2
import numpy as np
import time
import threading
from typing import Optional, Tuple, List, Callable
from PIL import Image
import logging

logger = logging.getLogger(__name__)


class EnhancedCameraInterface:
    """
    Enhanced camera interface with multiple camera support, real-time preview, and better error handling
    """
    
    def __init__(self, camera_id: int = 0, resolution: Tuple[int, int] = (640, 480)):
        """
        Initialize enhanced camera interface
        
        Args:
            camera_id: Camera device ID (default 0 for primary camera)
            resolution: Camera resolution as (width, height)
        """
        self.camera_id = camera_id
        self.resolution = resolution
        self.camera = None
        self.is_capturing = False
        self.preview_thread = None
        self.preview_callback = None
        self.frame_count = 0
        self.last_frame_time = 0
        
        # Camera parameters
        self.exposure = -8  # Auto exposure
        self.brightness = 50
        self.contrast = 50
        self.saturation = 50
        
        # Initialize camera
        self.initialize_camera()
    
    def initialize_camera(self) -> bool:
        """
        Initialize the camera with proper settings
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            self.camera = cv2.VideoCapture(self.camera_id)
            
            if not self.camera.isOpened():
                raise Exception(f"Could not open camera {self.camera_id}")
            
            # Set resolution
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
            
            # Set camera parameters for better image quality
            self.camera.set(cv2.CAP_PROP_EXPOSURE, self.exposure)
            self.camera.set(cv2.CAP_PROP_BRIGHTNESS, self.brightness)
            self.camera.set(cv2.CAP_PROP_CONTRAST, self.contrast)
            self.camera.set(cv2.CAP_PROP_SATURATION, self.saturation)
            
            # Set auto focus
            self.camera.set(cv2.CAP_PROP_AUTOFOCUS, 1)
            
            # Test frame capture
            ret, frame = self.camera.read()
            if not ret:
                raise Exception("Failed to capture test frame")
            
            logger.info(f"Camera {self.camera_id} initialized successfully with resolution {self.resolution}")
            return True
            
        except Exception as e:
            logger.error(f"Camera initialization failed: {e}")
            if self.camera:
                self.camera.release()
                self.camera = None
            return False
    
    def capture_image(self, timeout: float = 5.0) -> Optional[np.ndarray]:
        """
        Capture a single frame from camera with timeout
        
        Args:
            timeout: Maximum time to wait for capture in seconds
            
        Returns:
            Captured frame as numpy array or None if failed
        """
        if not self.camera or not self.camera.isOpened():
            if not self.initialize_camera():
                return None
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            ret, frame = self.camera.read()
            if ret:
                self.frame_count += 1
                self.last_frame_time = time.time()
                return frame
            time.sleep(0.1)
        
        logger.warning(f"Failed to capture image after {timeout} seconds")
        return None
    
    def capture_multiple_images(self, count: int = 3, delay: float = 1.0) -> List[np.ndarray]:
        """
        Capture multiple images with delay between captures
        
        Args:
            count: Number of images to capture
            delay: Delay between captures in seconds
            
        Returns:
            List of captured frames
        """
        images = []
        for i in range(count):
            frame = self.capture_image()
            if frame is not None:
                images.append(frame)
                if i < count - 1:  # Don't sleep after last capture
                    time.sleep(delay)
        
        return images
    
    def start_preview(self, callback: Callable[[np.ndarray], None] = None, 
                     fps: int = 30) -> bool:
        """
        Start real-time camera preview
        
        Args:
            callback: Function to call with each frame
            fps: Frames per second for preview
            
        Returns:
            bool: True if preview started successfully
        """
        if self.is_capturing:
            logger.info("Preview is already running")
            return False
        
        if not self.camera or not self.camera.isOpened():
            if not self.initialize_camera():
                return False
        
        self.is_capturing = True
        self.preview_callback = callback
        
        def preview_loop():
            while self.is_capturing:
                ret, frame = self.camera.read()
                if ret:
                    if callback:
                        callback(frame)
                else:
                    logger.warning("Failed to capture frame in preview")
                    time.sleep(0.1)
                
                # Control frame rate
                time.sleep(1.0 / fps)
        
        self.preview_thread = threading.Thread(target=preview_loop)
        self.preview_thread.daemon = True
        self.preview_thread.start()
        
        logger.info(f"Camera preview started at {fps} FPS")
        return True
    
    def stop_preview(self):
        """Stop camera preview"""
        self.is_capturing = False
        if self.preview_thread:
            self.preview_thread.join(timeout=2.0)
            self.preview_thread = None
        logger.info("Camera preview stopped")
    
    def get_camera_info(self) -> dict:
        """Get camera information and current settings"""
        if not self.camera or not self.camera.isOpened():
            return {"status": "not_opened"}
        
        return {
            "camera_id": self.camera_id,
            "resolution": (self.camera.get(cv2.CAP_PROP_FRAME_WIDTH),
                          self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": self.camera.get(cv2.CAP_PROP_FPS),
            "brightness": self.camera.get(cv2.CAP_PROP_BRIGHTNESS),
            "contrast": self.camera.get(cv2.CAP_PROP_CONTRAST),
            "saturation": self.camera.get(cv2.CAP_PROP_SATURATION),
            "exposure": self.camera.get(cv2.CAP_PROP_EXPOSURE),
            "auto_focus": self.camera.get(cv2.CAP_PROP_AUTOFOCUS),
            "frame_count": self.frame_count,
            "last_frame_time": self.last_frame_time
        }
    
    def set_camera_parameter(self, param: str, value: float) -> bool:
        """
        Set camera parameter
        
        Args:
            param: Parameter name ('brightness', 'contrast', 'saturation', 'exposure')
            value: Parameter value
            
        Returns:
            bool: True if parameter set successfully
        """
        if not self.camera or not self.camera.isOpened():
            return False
        
        param_map = {
            'brightness': cv2.CAP_PROP_BRIGHTNESS,
            'contrast': cv2.CAP_PROP_CONTRAST,
            'saturation': cv2.CAP_PROP_SATURATION,
            'exposure': cv2.CAP_PROP_EXPOSURE
        }
        
        if param in param_map:
            self.camera.set(param_map[param], value)
            setattr(self, param, value)
            return True
        
        return False
    
    def release(self):
        """Release camera resources"""
        self.stop_preview()
        if self.camera:
            self.camera.release()
            self.camera = None
        cv2.destroyAllWindows()
    
    def __del__(self):
        """Cleanup resources"""
        self.release()
