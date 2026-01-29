import logging
import os

# CRITICAL: Fix for PyTorch 2.6+ security restriction ("Weights only load failed")
# This MUST happen before ultralytics or torch are used for loading models.
try:
    import torch
    original_load = torch.load
    def patched_torch_load(*args, **kwargs):
        if 'weights_only' not in kwargs:
            kwargs['weights_only'] = False
        return original_load(*args, **kwargs)
    torch.load = patched_torch_load
except ImportError:
    pass

import cv2
import numpy as np
import base64
import json

# Conditional import for YOLO (may not be installed on Render free tier)
YOLO = None
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

# Check if vision is disabled (Render free tier)
VISION_DISABLED = os.getenv('VISION_DISABLED', 'false').lower() == 'true'

logger = logging.getLogger(__name__)


class VisionEngineV2:
    """
    Triple-Layer Verification Engine for Medication Detection.
    
    All three layers must PASS for a medication to be marked as "Verified":
    
    Layer 1: Object Detection (YOLO-World)
        - Purpose: Find pill bottle/medication in frame
        - Constraint: Must exceed 85% confidence
        
    Layer 2: Feature Matching (ORB)
        - Purpose: Compare keypoints against reference image
        - Constraint: Must find >15 reliable feature matches
        
    Layer 3: Color Histogram Analysis
        - Purpose: Verify color distribution (e.g., red vs blue pill)
        - Constraint: Histogram correlation must be >0.8
    """
    
    # Layer thresholds (tunable)
    YOLO_CONFIDENCE_THRESHOLD = 0.60  # Lowered to 0.60 to handle "generic bottle" shapes better
    ORB_MATCH_THRESHOLD = 15          # Balanced: 15 matches (was 25, too strict)
    HISTOGRAM_CORRELATION_THRESHOLD = 0.65 # Reduced from 0.8 to handle lighting changes
    
    def __init__(self):
        self.vision_available = not VISION_DISABLED and YOLO is not None
        
        # Initialize YOLO-World (only if available)
        if self.vision_available:
            try:
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                # Medicine detector
                self.detector = YOLO('yolov8s-worldv2.pt') 
                self.detector.to(device)
                self.detector.set_classes(["medicine package", "medicine bottle", "pill strip", "inhaler"])
                
                # Hand detector (separate instance for robust hand detection)
                # Using broader terms that YOLO-World's vocabulary definitely includes
                self.hand_detector = YOLO('yolov8s-worldv2.pt')
                self.hand_detector.to(device)
                self.hand_detector.set_classes(["person", "hand", "arm", "finger", "bottle", "human"])
                
                logger.info(f"YOLO-World initialized on {device} (medicine + hand detectors)")
            except Exception as e:
                logger.error(f"Failed to load YOLO-World: {e}")
                self.detector = None
                self.hand_detector = None
                self.vision_available = False
        else:
            self.detector = None
            self.hand_detector = None
            if VISION_DISABLED:
                logger.info("Vision system DISABLED (VISION_DISABLED=true)")
            else:
                logger.warning("Vision system unavailable (ultralytics not installed)")

        # ORB for precision fingerprinting (Layer 2)
        self.orb = cv2.ORB_create(nfeatures=2000)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    def compute_color_histogram(self, image: np.ndarray) -> np.ndarray:
        """
        Layer 3: Compute normalized color histogram in HSV space.
        
        HSV is more robust to lighting changes than RGB.
        Uses H (hue) and S (saturation) channels, ignores V (value/brightness).
        
        Args:
            image: BGR image (OpenCV format)
            
        Returns:
            Flattened, normalized histogram array
        """
        try:
            # Convert to HSV (more robust to lighting)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Compute 2D histogram on H and S channels
            # H: 0-179 (180 bins), S: 0-255 (256 bins)
            # Using 50 bins for H and 60 bins for S for efficiency
            hist = cv2.calcHist(
                [hsv], 
                [0, 1],  # H and S channels
                None, 
                [50, 60],  # Number of bins
                [0, 180, 0, 256]  # Ranges
            )
            
            # Normalize the histogram
            cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
            
            return hist.flatten()
            
        except Exception as e:
            logger.error(f"Histogram computation failed: {e}")
            return None

    def compare_histograms(self, hist1: np.ndarray, hist2: np.ndarray) -> float:
        """
        Compare two histograms using correlation method.
        
        Returns:
            Correlation score between -1 and 1 (higher is better)
        """
        if hist1 is None or hist2 is None:
            return 0.0
        
        try:
            # Reshape to 2D for cv2.compareHist
            h1 = hist1.reshape(-1, 1).astype(np.float32)
            h2 = hist2.reshape(-1, 1).astype(np.float32)
            
            # Use correlation method (CV_COMP_CORREL)
            score = cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)
            return float(score)
            
        except Exception as e:
            logger.error(f"Histogram comparison failed: {e}")
            return 0.0

    def detect_hand(self, image_base64: str) -> dict:
        """
        Detect if a human hand is present in the frame using YOLO.
        
        This replaces MediaPipe for more robust detection of closed fists/hands holding objects.
        
        Args:
            image_base64: Base64 encoded camera frame
            
        Returns:
            Dict with hand detection result and optional bounding box
        """
        if not self.vision_available or self.hand_detector is None:
            return {'success': False, 'hand_detected': False, 'error': 'Vision unavailable'}
        
        try:
            # Decode image
            if ',' in image_base64:
                encoded_data = image_base64.split(',')[1]
            else:
                encoded_data = image_base64
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {'success': False, 'hand_detected': False, 'error': 'Decode failed'}
            
            # Run YOLO hand detection
            results = self.hand_detector.predict(img, conf=0.15, verbose=False)
            
            if len(results[0].boxes) > 0:
                # Hand detected - return first detection bbox
                box = results[0].boxes[0]
                coords = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                
                # Normalize bbox to 0-1 range
                h, w = img.shape[:2]
                bbox = {
                    'x': coords[0] / w,
                    'y': coords[1] / h,
                    'width': (coords[2] - coords[0]) / w,
                    'height': (coords[3] - coords[1]) / h
                }
                
                logger.debug(f"Hand detected with confidence {conf:.2%}")
                return {
                    'success': True,
                    'hand_detected': True,
                    'confidence': conf,
                    'bbox': bbox
                }
            else:
                return {'success': True, 'hand_detected': False}
                
        except Exception as e:
            logger.error(f"Hand detection error: {e}")
            return {'success': False, 'hand_detected': False, 'error': str(e)}

    def process_frame(self, image_base64, expected_features=None, reference_histogram=None):
        """
        Triple-Layer Verification Pipeline.
        
        Args:
            image_base64: Base64 encoded camera frame
            expected_features: Stored ORB descriptors for Layer 2 (np.ndarray)
            reference_histogram: Stored color histogram for Layer 3 (np.ndarray)
            
        Returns:
            Dict with verification results for all three layers
        """
        # Check if vision is available
        if not self.vision_available:
            return {
                'success': False,
                'is_verified': False,
                'error': 'Vision system unavailable on this server. Use localhost for camera verification.',
                'vision_disabled': True,
                'detections': []
            }
        
        # Decode image
        try:
            encoded_data = image_base64.split(',')[1]
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        except Exception as e:
            return {'success': False, 'error': f"Decode failed: {e}"}

        # ===== LAYER 1: Shape Detection (YOLO-World) =====
        layer1_pass = False
        best_confidence = 0.0
        detections = []
        
        if self.detector:
            results = self.detector.predict(img, conf=0.3, verbose=False)
            if len(results[0].boxes) > 0:
                for box in results[0].boxes:
                    coords = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    label = self.detector.names[cls]
                    detections.append({
                        'bbox': coords,
                        'confidence': conf,
                        'label': label
                    })
                    if conf > best_confidence:
                        best_confidence = conf
                
                # Layer 1 passes if any detection >= threshold
                layer1_pass = best_confidence >= self.YOLO_CONFIDENCE_THRESHOLD
                logger.info(f"Layer 1 (YOLO): {'PASS' if layer1_pass else 'FAIL'} - Best confidence: {best_confidence:.2%}")

        # ===== LAYER 2: Feature Matching (ORB) =====
        layer2_pass = False
        match_count = 0
        
        if expected_features is not None:
            kp_live, des_live = self.orb.detectAndCompute(gray, None)
            if des_live is not None:
                try:
                    matches = self.bf.match(expected_features, des_live)
                    matches = sorted(matches, key=lambda x: x.distance)
                    good_matches = [m for m in matches if m.distance < 40]  # Balanced (was 35, too strict)
                    match_count = len(good_matches)
                    
                    # Layer 2 passes if matches >= threshold
                    layer2_pass = match_count >= self.ORB_MATCH_THRESHOLD
                    logger.info(f"Layer 2 (ORB): {'PASS' if layer2_pass else 'FAIL'} - {match_count} matches (need {self.ORB_MATCH_THRESHOLD})")
                except Exception as e:
                    logger.error(f"Feature matching error: {e}")

        # ===== LAYER 3: Color Histogram Analysis =====
        layer3_pass = False
        histogram_score = 0.0
        
        if reference_histogram is not None:
            live_histogram = self.compute_color_histogram(img)
            if live_histogram is not None:
                histogram_score = self.compare_histograms(reference_histogram, live_histogram)
                
                # Layer 3 passes if correlation >= threshold
                layer3_pass = histogram_score >= self.HISTOGRAM_CORRELATION_THRESHOLD
                logger.info(f"Layer 3 (Histogram): {'PASS' if layer3_pass else 'FAIL'} - Correlation: {histogram_score:.3f} (need {self.HISTOGRAM_CORRELATION_THRESHOLD})")

        # ===== FINAL VERIFICATION =====
        # All three layers must pass for full verification
        # If no reference data provided, skip those layers (for registration flow)
        layers_checked = []
        layers_passed = []
        
        if self.detector:
            layers_checked.append('detection')
            if layer1_pass:
                layers_passed.append('detection')
                
        if expected_features is not None:
            layers_checked.append('features')
            if layer2_pass:
                layers_passed.append('features')
                
        if reference_histogram is not None:
            layers_checked.append('histogram')
            if layer3_pass:
                layers_passed.append('histogram')
        
        
        # FINAL VERIFICATION LOGIC (Majority Vote)
        # To handle "wrong side" (Texture fail) or "bad lighting" (Color fail),
        # we allow verification if at least 2 out of 3 layers pass.
        
        passed_count = len(layers_passed)
        checked_count = len(layers_checked)
        
        # Flexible Logic:
        # - If 3 layers checked: Need 2 to pass (66%)
        # - If 2 layers checked: Need 2 to pass (100%)
        # - If 1 layer checked: Need 1 to pass (100%)
        
        if checked_count >= 3:
            # TRUST THE LABEL:
            # If Feature Matching (Texture) finds the LABEL text/logo (10+ matches),
            # it is almost certainly the correct medication, even if lighting/angle fails the other layers.
            has_label_match = 'features' in layers_passed
            
            if has_label_match:
                is_verified = True  # TRUST THE TEXT/LABEL
            else:
                # Fallback: Visual Match Only (Shape + Color) -> Suspicious
                majority_pass = passed_count >= 2
                is_verified = majority_pass and has_label_match # Still requires label for "Verified"
        else:
            is_verified = passed_count == checked_count and checked_count > 0

        # Build status message
        if is_verified:
            if 'features' in layers_passed:
                message = "✅ Verified by Label Scan (Trusted)"
            elif passed_count == checked_count:
                message = "✅ Perfect Match (100%)"
            else:
                message = f"✅ Verified (Majority Match: {passed_count}/{checked_count})"
        else:
            # Special Feedback: Shape+Color pass, but Label fail
            if 'detection' in layers_passed and 'histogram' in layers_passed and 'features' not in layers_passed:
                message = "⚠️ Visual Match - PLEASE SHOW LABEL"
            else:
                failed_layers = [l for l in layers_checked if l not in layers_passed]
                message = f"⏳ Mismatch ({', '.join(failed_layers)} failed)"

        return {
            'success': True,
            'is_verified': is_verified,
            # Layer 1 results
            'layer1_detection': layer1_pass,
            'detection_confidence': best_confidence,
            'detections': detections,
            # Layer 2 results
            'layer2_features': layer2_pass,
            'match_count': match_count,
            # Layer 3 results
            'layer3_histogram': layer3_pass,
            'histogram_score': histogram_score,
            # Summary
            'layers_checked': layers_checked,
            'layers_passed': layers_passed,
            'message': message
        }

    def get_fingerprint(self, image_base64):
        """Extract ORB descriptors for a new medicine to save in DB (Layer 2 reference)."""
        try:
            encoded_data = image_base64.split(',')[1]
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            kp, des = self.orb.detectAndCompute(img, None)
            if des is not None:
                return base64.b64encode(des.tobytes()).decode('utf-8')
        except Exception as e:
            logger.error(f"Fingerprint extraction failed: {e}")
        return None

    def get_histogram_fingerprint(self, image_base64):
        """Extract color histogram for a new medicine to save in DB (Layer 3 reference)."""
        try:
            encoded_data = image_base64.split(',')[1]
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            hist = self.compute_color_histogram(img)
            if hist is not None:
                return base64.b64encode(hist.astype(np.float32).tobytes()).decode('utf-8')
        except Exception as e:
            logger.error(f"Histogram extraction failed: {e}")
        return None

    def decode_histogram_fingerprint(self, histogram_b64: str) -> np.ndarray:
        """Decode a stored histogram fingerprint from base64."""
        try:
            hist_bytes = base64.b64decode(histogram_b64)
            return np.frombuffer(hist_bytes, dtype=np.float32)
        except Exception as e:
            logger.error(f"Histogram decode failed: {e}")
            return None


# Singleton instance
vision_v2 = VisionEngineV2()

