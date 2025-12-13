"""
Robust Medication Verification System
Implements surgical improvements for production reliability:
1. Geometry consistency checks (aspect ratio, size validation)
2. Frame stability (N consecutive frames must agree)
3. Multi-signal weighted confidence (not boolean OR)
4. Better embedding model (EfficientNet-B0 in feature_extractor.py)

This module wraps the existing verification with additional robustness.
"""
from typing import Dict, Optional, List, Tuple
from collections import deque
import numpy as np
import cv2
import time

# Frame stability buffer - stores recent verification results
_verification_history: Dict[int, deque] = {}  # medication_id -> deque of results
STABILITY_WINDOW = 5  # Number of frames to consider
STABILITY_THRESHOLD = 3  # Minimum frames that must agree

# Geometry thresholds
ASPECT_RATIO_TOLERANCE = 0.5  # Allow 50% deviation from reference aspect ratio
MIN_OBJECT_AREA_RATIO = 0.05  # Object must be at least 5% of frame
MAX_OBJECT_AREA_RATIO = 0.80  # Object can be at most 80% of frame


def check_geometry_consistency(
    detected_bbox: Tuple[int, int, int, int],
    reference_aspect_ratio: Optional[float],
    frame_shape: Tuple[int, int]
) -> Tuple[bool, float, str]:
    """
    Check if detected object's geometry is consistent with expectations.
    
    Args:
        detected_bbox: (x1, y1, x2, y2) bounding box
        reference_aspect_ratio: Expected aspect ratio from reference image (w/h)
        frame_shape: (height, width) of the frame
    
    Returns:
        (passed, score, reason)
    """
    x1, y1, x2, y2 = detected_bbox
    width = x2 - x1
    height = y2 - y1
    
    if width <= 0 or height <= 0:
        return False, 0.0, "Invalid bounding box"
    
    frame_h, frame_w = frame_shape[:2]
    frame_area = frame_h * frame_w
    object_area = width * height
    
    # Check 1: Object size relative to frame
    area_ratio = object_area / frame_area
    if area_ratio < MIN_OBJECT_AREA_RATIO:
        return False, 0.3, f"Object too small ({area_ratio:.1%} of frame)"
    if area_ratio > MAX_OBJECT_AREA_RATIO:
        return False, 0.3, f"Object too large ({area_ratio:.1%} of frame)"
    
    # Check 2: Aspect ratio consistency (if reference available)
    detected_aspect_ratio = width / height
    if reference_aspect_ratio is not None:
        ratio_diff = abs(detected_aspect_ratio - reference_aspect_ratio) / max(reference_aspect_ratio, 0.1)
        if ratio_diff > ASPECT_RATIO_TOLERANCE:
            return False, 0.4, f"Aspect ratio mismatch (detected {detected_aspect_ratio:.2f}, expected {reference_aspect_ratio:.2f})"
    
    # All checks passed
    geometry_score = 1.0 - (area_ratio - 0.2) * 0.5  # Optimal is around 20% of frame
    geometry_score = max(0.5, min(1.0, geometry_score))
    
    return True, geometry_score, "Geometry OK"


def calculate_weighted_confidence(
    barcode_result: Optional[Dict],
    embedding_result: Optional[Dict],
    ocr_result: Optional[Dict],
    yolo_confidence: float,
    geometry_score: float
) -> Tuple[float, str, Dict]:
    """
    Calculate weighted confidence from multiple signals.
    Not a boolean OR - uses weighted sum for explainability.
    
    Weights:
    - Barcode: 1.0 (deterministic, instant accept)
    - Embedding: 0.45
    - OCR: 0.25
    - YOLO: 0.15
    - Geometry: 0.15
    
    Returns:
        (final_confidence, primary_method, detailed_breakdown)
    """
    # If barcode matches, instant accept
    if barcode_result and barcode_result.get('is_correct'):
        return 1.0, 'barcode', {'barcode': 1.0, 'method': 'deterministic'}
    
    # Weights for other signals
    WEIGHTS = {
        'embedding': 0.45,
        'ocr': 0.25,
        'yolo': 0.15,
        'geometry': 0.15
    }
    
    scores = {}
    total_weight = 0.0
    weighted_sum = 0.0
    
    # Embedding score
    if embedding_result:
        emb_conf = embedding_result.get('confidence', 0.0)
        emb_correct = embedding_result.get('is_correct', False)
        scores['embedding'] = emb_conf if emb_correct else emb_conf * 0.3
        weighted_sum += scores['embedding'] * WEIGHTS['embedding']
        total_weight += WEIGHTS['embedding']
    
    # OCR score
    if ocr_result:
        ocr_conf = ocr_result.get('confidence', 0.0)
        ocr_correct = ocr_result.get('is_correct', False)
        scores['ocr'] = ocr_conf if ocr_correct else ocr_conf * 0.3
        weighted_sum += scores['ocr'] * WEIGHTS['ocr']
        total_weight += WEIGHTS['ocr']
    
    # YOLO confidence
    if yolo_confidence > 0:
        scores['yolo'] = yolo_confidence
        weighted_sum += yolo_confidence * WEIGHTS['yolo']
        total_weight += WEIGHTS['yolo']
    
    # Geometry score
    if geometry_score > 0:
        scores['geometry'] = geometry_score
        weighted_sum += geometry_score * WEIGHTS['geometry']
        total_weight += WEIGHTS['geometry']
    
    # Calculate final confidence
    if total_weight > 0:
        final_confidence = weighted_sum / total_weight
    else:
        final_confidence = 0.0
    
    # Determine primary method
    if scores:
        primary_method = max(scores.items(), key=lambda x: x[1])[0]
    else:
        primary_method = 'none'
    
    return final_confidence, primary_method, scores


def check_frame_stability(
    medication_id: int,
    is_correct: bool,
    confidence: float
) -> Tuple[bool, int, int]:
    """
    Check if verification is stable across multiple frames.
    Prevents random spikes from causing false accepts.
    
    Args:
        medication_id: ID of medication being verified
        is_correct: Current frame's verification result
        confidence: Current frame's confidence
    
    Returns:
        (is_stable, positive_count, total_count)
    """
    global _verification_history
    
    # Initialize history for this medication if needed
    if medication_id not in _verification_history:
        _verification_history[medication_id] = deque(maxlen=STABILITY_WINDOW)
    
    # Add current result
    _verification_history[medication_id].append({
        'is_correct': is_correct,
        'confidence': confidence,
        'timestamp': time.time()
    })
    
    history = _verification_history[medication_id]
    
    # Count positive results
    positive_count = sum(1 for h in history if h['is_correct'] and h['confidence'] > 0.6)
    total_count = len(history)
    
    # Check if stable
    is_stable = positive_count >= STABILITY_THRESHOLD
    
    return is_stable, positive_count, total_count


def clear_stability_history(medication_id: Optional[int] = None):
    """Clear frame stability history (call when medication changes or user accepts)"""
    global _verification_history
    
    if medication_id is not None:
        _verification_history.pop(medication_id, None)
    else:
        _verification_history.clear()


def extract_reference_geometry(reference_image_base64: str) -> Optional[float]:
    """Extract aspect ratio from reference image for geometry checks"""
    try:
        import base64
        
        if ',' in reference_image_base64:
            reference_image_base64 = reference_image_base64.split(',')[1]
        
        image_bytes = base64.b64decode(reference_image_base64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is not None:
            h, w = image.shape[:2]
            return w / h  # aspect ratio
    except Exception as e:
        print(f"Reference geometry extraction error: {e}")
    
    return None


def robust_verify_medication(
    image: np.ndarray,
    expected_medication_id: int,
    user_id: int,
    detected_bbox: Optional[Tuple[int, int, int, int]] = None,
    yolo_confidence: float = 0.0,
    scanned_barcode: Optional[str] = None
) -> Dict:
    """
    Robust medication verification with all improvements applied.
    
    This wraps the existing verification logic with:
    1. Geometry consistency checks
    2. Multi-signal weighted confidence
    3. Frame stability requirements
    
    Args:
        image: Camera frame
        expected_medication_id: ID of expected medication
        user_id: Current user ID
        detected_bbox: YOLO detection bounding box (x1, y1, x2, y2)
        yolo_confidence: YOLO detection confidence
        scanned_barcode: Barcode if detected
    
    Returns:
        Enhanced verification result with stability info
    """
    from app.models.medication import Medication
    from app.utils.medication_verification import verify_medication_comprehensive
    
    # Get medication for geometry reference
    medication = Medication.query.filter_by(id=expected_medication_id, user_id=user_id).first()
    if not medication:
        return {
            'success': False,
            'is_correct': False,
            'message': 'Medication not found',
            'stable': False
        }
    
    # Step 1: Geometry consistency check (if bbox provided)
    geometry_score = 1.0
    geometry_reason = "No bbox provided"
    
    if detected_bbox is not None:
        # Extract reference aspect ratio if available
        reference_aspect_ratio = None
        if medication.reference_images:
            try:
                import json
                refs = json.loads(medication.reference_images)
                if refs:
                    reference_aspect_ratio = extract_reference_geometry(refs[0])
            except:
                pass
        
        geo_passed, geometry_score, geometry_reason = check_geometry_consistency(
            detected_bbox,
            reference_aspect_ratio,
            image.shape
        )
        
        if not geo_passed and geometry_score < 0.4:
            return {
                'success': True,
                'is_correct': False,
                'message': f'⚠️ Geometry check failed: {geometry_reason}',
                'method': 'geometry',
                'confidence': geometry_score,
                'stable': False,
                'geometry_reason': geometry_reason
            }
    
    # Step 2: Run existing comprehensive verification
    base_result = verify_medication_comprehensive(
        image=image,
        expected_medication_id=expected_medication_id,
        user_id=user_id,
        scanned_barcode=scanned_barcode
    )
    
    # Step 3: Calculate weighted confidence
    barcode_result = None
    embedding_result = None
    ocr_result = None
    
    if 'all_methods' in base_result:
        for method_result in base_result['all_methods']:
            if method_result['method'] == 'barcode':
                barcode_result = method_result
            elif method_result['method'] in ['ai_training', 'visual']:
                embedding_result = method_result
            elif method_result['method'] == 'ocr':
                ocr_result = method_result
    
    # If barcode matched, use that result directly
    if base_result.get('method') == 'barcode' and base_result.get('is_correct'):
        clear_stability_history(expected_medication_id)
        return {
            **base_result,
            'stable': True,  # Barcode = always stable
            'weighted_confidence': 1.0,
            'confidence_breakdown': {'barcode': 1.0}
        }
    
    # Calculate weighted confidence
    weighted_conf, primary_method, breakdown = calculate_weighted_confidence(
        barcode_result=barcode_result,
        embedding_result=embedding_result,
        ocr_result=ocr_result,
        yolo_confidence=yolo_confidence,
        geometry_score=geometry_score
    )
    
    # Step 4: Check frame stability
    is_stable, positive_count, total_count = check_frame_stability(
        medication_id=expected_medication_id,
        is_correct=base_result.get('is_correct', False),
        confidence=weighted_conf
    )
    
    # Build enhanced result
    enhanced_result = {
        **base_result,
        'weighted_confidence': weighted_conf,
        'confidence_breakdown': breakdown,
        'geometry_score': geometry_score,
        'geometry_reason': geometry_reason,
        'stable': is_stable,
        'stability_info': {
            'positive_frames': positive_count,
            'total_frames': total_count,
            'required': STABILITY_THRESHOLD
        }
    }
    
    # Modify message based on stability
    if base_result.get('is_correct') and not is_stable:
        enhanced_result['message'] = f'⏳ Verifying... ({positive_count}/{STABILITY_THRESHOLD} frames)'
        enhanced_result['is_correct'] = False  # Don't accept until stable
    elif base_result.get('is_correct') and is_stable:
        clear_stability_history(expected_medication_id)  # Reset for next verification
        enhanced_result['message'] = f'✅ Verified! {medication.name} ({weighted_conf:.0%} confidence)'
    
    return enhanced_result
