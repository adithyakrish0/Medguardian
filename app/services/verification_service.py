"""Verification service - Business logic for medication verification"""
from typing import Dict, Optional, Tuple
import base64
import io
import cv2
import numpy as np
from PIL import Image
import logging

from app.vision.model_manager import model_manager
from app.vision.bottle_detector import MedicineBottleDetector
from app.vision.barcode_scanner import BarcodeScanner
from app.models.medication import Medication

logger = logging.getLogger(__name__)


class VerificationService:
    """Service for medication verification using vision AI"""
    
    def __init__(self):
        self.bottle_detector = None
        self.barcode_scanner = BarcodeScanner()
    
    def _get_bottle_detector(self) -> MedicineBottleDetector:
        """Lazy load bottle detector with shared model manager"""
        if self.bottle_detector is None:
            self.bottle_detector = MedicineBottleDetector()
        return self.bottle_detector
    
    def verify_with_image(self, image_data: str, medication_id: int) -> Dict:
        """
        Verify medication using uploaded/captured image
        
        Args:
            image_data: Base64 encoded image data URI
            medication_id: Expected medication ID
            
        Returns:
            Verification result dictionary
        """
        try:
            # Decode base64 image
            image_np = self._decode_image(image_data)
            if image_np is None:
                return {
                    'success': False,
                    'verified': False,
                    'error': 'Invalid image data'
                }
            
            # Get medication from database
            medication = Medication.query.get(medication_id)
            if not medication:
                return {
                    'success': False,
                    'verified': False,
                    'error': 'Medication not found'
                }
            
            # Try barcode verification first (fastest)
            if medication.barcode:
                barcode_result = self._verify_barcode(image_np, medication.barcode)
                if barcode_result['found']:
                    return {
                        'success': True,
                        'verified': barcode_result['match'],
                        'correct_medication': barcode_result['match'],
                        'method': 'barcode',
                        'confidence': 1.0 if barcode_result['match'] else 0.0,
                        'message': 'Barcode verified' if barcode_result['match'] else 'Wrong medication (barcode mismatch)'
                    }
            
            # Try bottle detection
            detector = self._get_bottle_detector()
            bottles_detected, detections, _ = detector.detect_bottles(image_np)
            
            if not bottles_detected:
                return {
                    'success': True,
                    'verified': False,
                    'correct_medication': False,
                    'method': 'vision',
                    'confidence': 0.0,
                    'message': 'No medication bottle detected. Please ensure the medication is clearly visible.'
                }
            
            # If we have reference image, compare
            if medication.reference_image_path:
                visual_match = self._compare_with_reference(image_np, medication)
                return {
                    'success': True,
                    'verified': True,
                    'correct_medication': visual_match['match'],
                    'method': 'visual_comparison',
                    'confidence': visual_match['confidence'],
                    'message': 'Correct medication!' if visual_match['match'] else 'Medication does not match reference'
                }
            
            # Default: bottle detected but can't verify without reference
            return {
                'success': True,
                'verified': True,
                'correct_medication': True,  # Assume correct if bottle detected
                'method': 'detection_only',
                'confidence': 0.7,
                'message': f'Detected {len(detections)} medication bottle(s)',
                'warning': 'No reference image available for verification'
            }
            
        except Exception as e:
            logger.error(f"Verification error: {e}", exc_info=True)
            return {
                'success': False,
                'verified': False,
                'error': str(e)
            }
    
    def _decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """Decode base64 image data to numpy array"""
        try:
            # Remove data URI prefix
            if image_data.startswith('data:image/'):
                image_data = image_data.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to numpy array (OpenCV format)
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            return image_np
            
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            return None
    
    def _verify_barcode(self, image: np.ndarray, expected_barcode: str) -> Dict:
        """Verify barcode in image matches expected"""
        try:
            barcodes = self.barcode_scanner.scan_barcodes(image)
            
            if not barcodes:
                return {'found': False, 'match': False}
            
            # Check if any barcode matches
            for barcode in barcodes:
                if barcode['data'] == expected_barcode:
                    return {'found': True, 'match': True, 'barcode': barcode}
            
            # Barcodes found but none match
            return {'found': True, 'match': False, 'barcodes': barcodes}
            
        except Exception as e:
            logger.error(f"Barcode verification error: {e}")
            return {'found': False, 'match': False, 'error': str(e)}
    
    def _compare_with_reference(self, image: np.ndarray, medication: Medication) -> Dict:
        """Compare captured image with reference image"""
        try:
            # Load reference image
            if not medication.reference_image_path:
                return {'match': False, 'confidence': 0.0, 'error': 'No reference image'}
            
            reference_image = cv2.imread(medication.reference_image_path)
            if reference_image is None:
                return {'match': False, 'confidence': 0.0, 'error': 'Failed to load reference image'}
            
            # Simple color histogram comparison
            hist_captured = cv2.calcHist([image], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            hist_reference = cv2.calcHist([reference_image], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            
            # Normalize
            cv2.normalize(hist_captured, hist_captured, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            cv2.normalize(hist_reference, hist_reference, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            
            # Compare using correlation
            similarity = cv2.compareHist(hist_captured, hist_reference, cv2.HISTCMP_CORREL)
            
            # Threshold: 0.7+ is a match
            match = similarity >= 0.7
            
            return {
                'match': match,
                'confidence': float(similarity),
                'method': 'histogram_correlation'
            }
            
        except Exception as e:
            logger.error(f"Visual comparison error: {e}")
            return {'match': False, 'confidence': 0.0, 'error': str(e)}
    
    def save_reference_image(self, image_data: str, medication_id: int, save_path: str) -> bool:
        """Save reference image for medication"""
        try:
            # Decode image
            image_np = self._decode_image(image_data)
            if image_np is None:
                return False
            
            # Save image
            cv2.imwrite(save_path, image_np)
            
            # Extract features (optional, for future enhancement)
            # Could store color histograms, edge features, etc.
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save reference image: {e}")
            return False


# Global service instance
verification_service = VerificationService()
