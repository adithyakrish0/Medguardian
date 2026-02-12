"""Verification service - Business logic for medication verification"""
from typing import Dict, Optional, Tuple
import base64
import io
import cv2
import numpy as np
from PIL import Image
import logging

from app.vision.vision_v2 import vision_v2
from app.vision.barcode_scanner import BarcodeScanner
from app.extensions import db
from app.models.medication import Medication

logger = logging.getLogger(__name__)


class VerificationService:
    """Service for medication verification using vision AI"""
    
    def __init__(self):
        self.vision_engine = vision_v2
        self.barcode_scanner = BarcodeScanner()
    
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
            
            # ===== TRIPLE-LAYER VERIFICATION ENGINE =====
            # Layer 2: ORB Feature Matching
            expected_des = None
            if medication.visual_fingerprint:
                try:
                    des_bytes = base64.b64decode(medication.visual_fingerprint)
                    expected_des = np.frombuffer(des_bytes, np.uint8).reshape(-1, 32)
                except Exception as e:
                    logger.error(f"Failed to decode ORB fingerprint: {e}")

            # Layer 3: Color Histogram
            reference_histogram = None
            if medication.histogram_fingerprint:
                try:
                    reference_histogram = self.vision_engine.decode_histogram_fingerprint(
                        medication.histogram_fingerprint
                    )
                except Exception as e:
                    logger.error(f"Failed to decode histogram fingerprint: {e}")

            # Layer 4: Deep Embedding Matching
            reference_embedding = None
            if medication.embedding_data:
                try:
                    import json
                    reference_embedding = json.loads(medication.embedding_data)
                except Exception as e:
                    logger.error(f"Failed to load embedding data: {e}")

            # Process via Triple-Layer Vision Engine V2
            result = self.vision_engine.process_frame(
                image_data, 
                expected_features=expected_des,
                reference_histogram=reference_histogram,
                reference_embedding=reference_embedding
            )
            
            # Check barcodes as fallback/supplement
            barcodes = self.barcode_scanner.scan_barcodes(image_np)
            has_barcode_match = False
            if barcodes and medication.barcode:
                has_barcode_match = any(b['data'] == medication.barcode for b in barcodes)
            
            is_verified = result.get('is_verified', False) or has_barcode_match
            
            # Calculate overall confidence from layers
            confidence = 0.0
            layers_passed = result.get('layers_passed', [])
            layers_checked = result.get('layers_checked', [])
            if layers_checked:
                confidence = len(layers_passed) / len(layers_checked)
            
            # Stage 4: Cognitive Guardrail (Alzheimer's Safety)
            from app.services.cognitive_engine import cognitive_engine
            cognitive_status = cognitive_engine.analyze_interaction(
                current_user.id if hasattr(current_user, 'id') else None,
                medication_id,
                is_success=is_verified
            )
            
            return {
                'success': True,
                'verified': is_verified,
                'correct_medication': is_verified,
                'method': 'triple_layer' if result.get('is_verified') else 'barcode' if has_barcode_match else 'none',
                'confidence': confidence,
                'message': result.get('message', ''),
                'cognitive_status': cognitive_status,
                'cognitive_emergency': cognitive_status == 'emergency',
                'layers': {
                    'detection': result.get('layer1_detection', False),
                    'features': result.get('layer2_features', False),
                    'histogram': result.get('layer3_histogram', False)
                },
                'details': result
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
        """Save reference image and extract Layer 2 + Layer 3 fingerprints"""
        try:
            # Decode image
            image_np = self._decode_image(image_data)
            if image_np is None:
                return False
            
            # Save image file
            cv2.imwrite(save_path, image_np)
            
            # Extract and store fingerprints for Triple-Layer verification
            medication = Medication.query.get(medication_id)
            if medication:
                # Layer 2: ORB Feature Fingerprint
                orb_fingerprint = self.vision_engine.get_fingerprint(image_data)
                if orb_fingerprint:
                    medication.visual_fingerprint = orb_fingerprint
                    logger.info(f"Saved Layer 2 (ORB) fingerprint for medication {medication_id}")
                
                # Layer 3: Color Histogram Fingerprint
                histogram_fingerprint = self.vision_engine.get_histogram_fingerprint(image_data)
                if histogram_fingerprint:
                    medication.histogram_fingerprint = histogram_fingerprint
                    logger.info(f"Saved Layer 3 (Histogram) fingerprint for medication {medication_id}")
                
                # Layer 4: Deep Embedding Fingerprint
                embedding_fingerprint = self.vision_engine.get_embedding_fingerprint(image_data)
                if embedding_fingerprint:
                    import json
                    medication.embedding_data = json.dumps(embedding_fingerprint)
                    logger.info(f"Saved Layer 4 (Deep Embedding) for medication {medication_id}")
                
                db.session.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save reference image: {e}")
            return False


# Global service instance
verification_service = VerificationService()
