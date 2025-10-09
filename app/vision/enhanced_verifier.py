import cv2
import numpy as np
import time
import threading
import os
from typing import Dict, List, Optional, Tuple
from .bottle_detector import MedicineBottleDetector
from .enhanced_camera import EnhancedCameraInterface
from .barcode_scanner import BarcodeScanner

class EnhancedMedicationVerifier:
    """
    Enhanced medication verification system with real-time detection, multiple capture modes,
    and comprehensive verification pipeline
    """
    
    def __init__(self, camera_id: int = 0, model_path: Optional[str] = None):
        """
        Initialize enhanced medication verifier
        
        Args:
            camera_id: Camera device ID
            model_path: Optional path to custom YOLO model for bottle detection
        """
        self.camera = EnhancedCameraInterface(camera_id)
        self.bottle_detector = MedicineBottleDetector(model_path)
        self.barcode_scanner = BarcodeScanner()
        self.is_running = False
        self.detection_thread = None
        self.detection_callback = None
        self.last_detection_result = None
        
        # Detection parameters
        self.confidence_threshold = 0.5
        self.min_bottle_count = 1
        self.max_bottle_count = 10
        self.enable_barcode_scanning = True
        
        # Performance tracking
        self.total_detections = 0
        self.successful_detections = 0
        self.average_detection_time = 0.0
        
        # Initialize barcode scanner if available
        try:
            import pyzbar
            self.pyzbar_available = True
        except ImportError:
            self.pyzbar_available = False
            self.enable_barcode_scanning = False
            print("PyZBar not available, barcode scanning disabled")
    
    def verify_medication(self, expected_medication_id: int = None, 
                         capture_mode: str = "single") -> Dict:
        """
        Verify medication using enhanced detection pipeline
        
        Args:
            expected_medication_id: Expected medication ID for verification
            capture_mode: "single", "multiple", or "stream"
            
        Returns:
            Dictionary with verification results
        """
        start_time = time.time()
        
        try:
            # Capture image(s) based on mode
            if capture_mode == "single":
                image = self.camera.capture_image()
                if image is None:
                    return self._create_error_result("Failed to capture image")
                images = [image]
            elif capture_mode == "multiple":
                images = self.camera.capture_multiple_images(count=3, delay=0.5)
                if not images:
                    return self._create_error_result("Failed to capture multiple images")
            else:
                return self._create_error_result(f"Unknown capture mode: {capture_mode}")
            
            # Process images
            best_result = None
            best_confidence = 0
            
            for i, image in enumerate(images):
                result = self._process_image(image, expected_medication_id)
                
                # Track best result
                if result['detected_bottles'] > 0:
                    avg_confidence = np.mean([d[4] for d in result['detections']])
                    if avg_confidence > best_confidence:
                        best_confidence = avg_confidence
                        best_result = result
                        result['image_index'] = i
            
            if best_result is None:
                best_result = self._create_error_result("No bottles detected in any image")
            
            # Update performance metrics
            detection_time = time.time() - start_time
            self.total_detections += 1
            if best_result['success']:
                self.successful_detections += 1
            
            # Update average detection time
            self.average_detection_time = (
                (self.average_detection_time * (self.total_detections - 1) + detection_time) / 
                self.total_detections
            )
            
            best_result['detection_time'] = detection_time
            best_result['performance_metrics'] = self.get_performance_metrics()
            
            self.last_detection_result = best_result
            return best_result
            
        except Exception as e:
            return self._create_error_result(f"Verification error: {str(e)}")
    
    def _process_image(self, image: np.ndarray, expected_medication_id: int = None) -> Dict:
        """Process a single image for bottle detection"""
        try:
            # Detect bottles
            bottles_detected, detections, annotated_image = self.bottle_detector.detect_bottles(
                image, return_image=True
            )
            
            result = {
                'success': bottles_detected,
                'message': "Bottles detected" if bottles_detected else "No bottles detected",
                'detected_bottles': len(detections),
                'detections': detections,
                'annotated_image': annotated_image,
                'barcode_verified': False,
                'bottle_positions': self.bottle_detector.get_bottle_positions(image)
            }
            
            # Barcode scanning if enabled and available
            if self.enable_barcode_scanning and bottles_detected:
                try:
                    barcodes = self.barcode_scanner.scan_barcodes(image)
                    result['barcodes'] = barcodes
                    
                    if expected_medication_id is not None:
                        result['barcode_verified'] = self._verify_barcodes(
                            barcodes, expected_medication_id
                        )
                        if result['barcode_verified']:
                            result['message'] = "Verification successful - bottles and barcode match"
                        else:
                            result['message'] = "Bottles detected but barcode verification failed"
                    
                except Exception as e:
                    print(f"Barcode scanning error: {e}")
                    result['barcode_error'] = str(e)
            
            return result
            
        except Exception as e:
            return self._create_error_result(f"Image processing error: {str(e)}")
    
    def _verify_barcodes(self, barcodes: List, expected_medication_id: int) -> bool:
        """Verify barcode matches expected medication"""
        expected_barcode = f"MED_{expected_medication_id}"
        
        for barcode in barcodes:
            if barcode['data'] == expected_barcode:
                return True
        
        return False
    
    def _create_error_result(self, message: str) -> Dict:
        """Create error result dictionary"""
        return {
            'success': False,
            'message': message,
            'detected_bottles': 0,
            'detections': [],
            'barcode_verified': False,
            'detection_time': 0,
            'performance_metrics': self.get_performance_metrics()
        }
    
    def start_realtime_detection(self, callback: callable = None, fps: int = 10):
        """
        Start real-time bottle detection
        
        Args:
            callback: Function to call with detection results
            fps: Frames per second for detection
        """
        if self.is_running:
            print("Real-time detection is already running")
            return
        
        self.is_running = True
        self.detection_callback = callback
        
        def detection_loop():
            while self.is_running:
                start_time = time.time()
                
                # Capture image
                image = self.camera.capture_image(timeout=1.0)
                if image is not None:
                    # Process image
                    result = self._process_image(image)
                    
                    # Update performance metrics
                    self.total_detections += 1
                    if result['success']:
                        self.successful_detections += 1
                    
                    # Call callback if provided
                    if callback:
                        callback(result, image)
                    
                    self.last_detection_result = result
                
                # Control frame rate
                elapsed = time.time() - start_time
                sleep_time = max(0, 1.0/fps - elapsed)
                time.sleep(sleep_time)
        
        self.detection_thread = threading.Thread(target=detection_loop)
        self.detection_thread.daemon = True
        self.detection_thread.start()
        
        print(f"Real-time detection started at {fps} FPS")
    
    def stop_realtime_detection(self):
        """Stop real-time detection"""
        self.is_running = False
        if self.detection_thread:
            self.detection_thread.join(timeout=2.0)
            self.detection_thread = None
        print("Real-time detection stopped")
    
    def get_performance_metrics(self) -> Dict:
        """Get performance metrics for the detection system"""
        success_rate = (self.successful_detections / self.total_detections * 100) if self.total_detections > 0 else 0
        
        return {
            'total_detections': self.total_detections,
            'successful_detections': self.successful_detections,
            'success_rate': success_rate,
            'average_detection_time': self.average_detection_time,
            'camera_info': self.camera.get_camera_info(),
            'model_loaded': self.bottle_detector.model is not None,
            'barcode_scanning_enabled': self.enable_barcode_scanning,
            'pyzbar_available': self.pyzbar_available
        }
    
    def save_detection_result(self, result: Dict, output_dir: str = "detections") -> bool:
        """
        Save detection result including annotated image
        
        Args:
            result: Detection result dictionary
            output_dir: Directory to save results
            
        Returns:
            bool: True if saved successfully
        """
        try:
            os.makedirs(output_dir, exist_ok=True)
            timestamp = int(time.time())
            
            if 'annotated_image' in result and result['annotated_image'] is not None:
                image_path = os.path.join(output_dir, f"detection_{timestamp}.jpg")
                cv2.imwrite(image_path, result['annotated_image'])
                result['saved_image_path'] = image_path
            
            # Save detection data
            json_path = os.path.join(output_dir, f"detection_{timestamp}.json")
            import json
            with open(json_path, 'w') as f:
                # Convert numpy arrays to lists for JSON serialization
                serializable_result = self._make_json_serializable(result)
                json.dump(serializable_result, f, indent=2)
            
            return True
            
        except Exception as e:
            print(f"Failed to save detection result: {e}")
            return False
    
    def _make_json_serializable(self, obj):
        """Convert numpy arrays and other non-serializable objects to JSON-friendly format"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: self._make_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_serializable(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._make_json_serializable(item) for item in obj)
        else:
            return obj
    
    def get_camera_preview(self, callback: callable = None, fps: int = 30) -> bool:
        """
        Start camera preview for user guidance
        
        Args:
            callback: Function to call with preview frames
            fps: Frames per second for preview
            
        Returns:
            bool: True if preview started successfully
        """
        return self.camera.start_preview(callback, fps)
    
    def stop_camera_preview(self):
        """Stop camera preview"""
        self.camera.stop_preview()
    
    def calibrate_camera(self, calibration_pattern: str = "chessboard") -> bool:
        """
        Camera calibration for better detection accuracy
        
        Args:
            calibration_pattern: Pattern type ("chessboard", "circles")
            
        Returns:
            bool: True if calibration successful
        """
        print("Camera calibration not yet implemented")
        return False
    
    def optimize_detection_settings(self, test_images: List[np.ndarray]) -> Dict:
        """
        Optimize detection settings based on test images
        
        Args:
            test_images: List of test images
            
        Returns:
            Dictionary with optimized settings
        """
        print("Detection optimization not yet implemented")
        return {}
    
    def cleanup(self):
        """Cleanup resources"""
        self.stop_realtime_detection()
        self.stop_camera_preview()
        self.camera.release()
        print("Enhanced medication verifier cleaned up")
    
    def __del__(self):
        """Cleanup resources"""
        self.cleanup()
