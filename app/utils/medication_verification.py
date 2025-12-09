"""
Complete Medication Verification Logic
Combines barcode, visual, and OCR methods
"""
from typing import Dict, Optional
import cv2
import numpy as np
import json

def verify_medication_comprehensive(
    image: np.ndarray,
    expected_medication_id: int,
    user_id: int,
    scanned_barcode: Optional[str] = None
) -> Dict:
    """
    Comprehensive medication verification using all available methods
    
    Priority:
    1. Barcode (if available and scanned)
    2. Visual similarity (color/shape matching)
    3. OCR text matching (reading label)
    
    Args:
        image: Captured image
        expected_medication_id: ID of medication user should take
        user_id: Current user ID
        scanned_barcode: Barcode if detected
    
    Returns:
        Dict with verification results including is_correct, method_used, confidence
    """
    from app.models.medication import Medication
    from app.vision.visual_verifier import visual_verifier
    
    # Get expected medication from database
    expected_med = Medication.query.filter_by(
        id=expected_medication_id,
        user_id=user_id
    ).first()
    
    if not expected_med:
        return {
            'success': False,
            'is_correct': False,
            'message': 'Expected medication not found',
            'method': 'none',
            'confidence': 0.0
        }
    
    verification_results = []
    
    # METHOD 1: Barcode Verification (fastest, most accurate IF available)
    if scanned_barcode and expected_med.barcode:
        barcode_match = scanned_barcode == expected_med.barcode
        verification_results.append({
            'method': 'barcode',
            'is_correct': barcode_match,
            'confidence': 1.0 if barcode_match else 0.0,
            'details': f'Scanned: {scanned_barcode}, Expected: {expected_med.barcode}'
        })
        
        # If barcode matches, we're done!
        if barcode_match:
            return {
                'success': True,
                'is_correct': True,
                'message': f'✅ Correct! {expected_med.name} verified by barcode',
                'method': 'barcode',
                'confidence': 1.0,
                'medication_name': expected_med.name
            }
    
    # METHOD 2: AI Training Visual Matching (Multi-angle reference comparison)
    # This is the NEW method using ResNet embeddings - most robust!
    # Now with BACKGROUND SUBTRACTION to prevent overfitting to room features
    if expected_med.reference_images and expected_med.ai_trained:
        try:
            from app.vision.feature_extractor import compare_to_references
            
            # Pass background image for subtraction if available
            background_img = getattr(expected_med, 'background_image', None)
            
            similarity_score, best_angle = compare_to_references(
                image, 
                expected_med.reference_images,
                background_image_base64=background_img  # NEW: background subtraction
            )
            
            ai_match = similarity_score >= 0.75  # Threshold for AI trained match
            verification_results.append({
                'method': 'ai_training',
                'is_correct': ai_match,
                'confidence': similarity_score,
                'details': f'AI Match: {similarity_score:.0%} (angle {best_angle})' + (' [bg-sub]' if background_img else '')
            })
            
            # High confidence AI match = verified!
            if similarity_score > 0.85:
                return {
                    'success': True,
                    'is_correct': True,
                    'message': f'✅ AI Verified! {expected_med.name} ({similarity_score:.0%} match)',
                    'method': 'ai_training',
                    'confidence': similarity_score,
                    'medication_name': expected_med.name,
                    'match_angle': best_angle
                }
        except Exception as e:
            print(f"AI training comparison error: {e}")
    
    # METHOD 3: Legacy Visual Similarity (fallback for old medications)
    if expected_med.image_features:
        try:
            stored_features = json.loads(expected_med.image_features)
            similarity_score = visual_verifier.compare_images(stored_features, image)
            
            visual_match = similarity_score >= visual_verifier.similarity_threshold
            verification_results.append({
                'method': 'visual',
                'is_correct': visual_match,
                'confidence': similarity_score,
                'details': f'Similarity: {similarity_score:.2%}'
            })
            
            # If high confidence visual match
            if similarity_score > 0.85:
                return {
                    'success': True,
                    'is_correct': True,
                    'message': f'✅ Correct! {expected_med.name} verified visually ({similarity_score:.0%} match)',
                    'method': 'visual',
                    'confidence': similarity_score,
                    'medication_name': expected_med.name
                }
        except Exception as e:
            print(f"Visual comparison error: {e}")
    
    # METHOD 4: OCR Text Matching with FUZZY support
    extracted_text = visual_verifier.extract_text_ocr(image)
    if extracted_text:
        # Try fuzzy matching first
        from app.vision.feature_extractor import fuzzy_match
        fuzzy_matched = fuzzy_match(extracted_text, expected_med.name, tolerance=2)
        
        # Also try exact matching as fallback
        text_match, text_confidence = visual_verifier.verify_by_text(
            expected_med.name,
            extracted_text
        )
        
        # Use fuzzy result if exact didn't match
        if fuzzy_matched and not text_match:
            text_match = True
            text_confidence = 0.75  # Fuzzy match confidence
        
        verification_results.append({
            'method': 'ocr',
            'is_correct': text_match,
            'confidence': text_confidence,
            'details': f'Text found: "{extracted_text[:50]}"'
        })
        
        # If text matches
        if text_match and text_confidence > 0.7:
            return {
                'success': True,
                'is_correct': True,
                'message': f'✅ Correct! {expected_med.name} verified by label text',
                'method': 'ocr',
                'confidence': text_confidence,
                'medication_name': expected_med.name,
                'extracted_text': extracted_text
            }
    
    # DECISION: Combine all methods
    if verification_results:
        # Take highest confidence positive result
        positive_results = [r for r in verification_results if r['is_correct']]
        
        if positive_results:
            best = max(positive_results, key=lambda x: x['confidence'])
            if best['confidence'] > 0.6:  # Minimum threshold
                return {
                    'success': True,
                    'is_correct': True,
                    'message': f'✅ Correct! {expected_med.name} verified by {best["method"]}',
                    'method': best['method'],
                    'confidence': best['confidence'],
                    'medication_name': expected_med.name,
                    'all_methods': verification_results
                }
    
    # FAILED VERIFICATION
    return {
        'success': True,  # Verification completed, but...
        'is_correct': False,  # NOT the correct medication!
        'message': f'❌ Wrong medication! Expected: {expected_med.name}',
        'method': 'multiple',
        'confidence': 0.0,
        'expected_medication': expected_med.name,
        'all_methods': verification_results
    }


def get_next_expected_medication(user_id: int) -> Optional[Dict]:
    """
    Get the medication user should take next based on current time and schedule
    """
    from app.models.medication import Medication
    from datetime import datetime, time as dt_time
    import json
    
    medications = Medication.query.filter_by(user_id=user_id).all()
    if not medications:
        return None
    
    now = datetime.now()
    current_time = now.time()
    
    # Define period times
    periods = {
        'morning': (dt_time(7, 0), dt_time(9, 0)),
        'afternoon': (dt_time(12, 0), dt_time(14, 0)),
        'evening': (dt_time(18, 0), dt_time(20, 0)),
        'night': (dt_time(21, 0), dt_time(23, 59))
    }
    
    # Find current or next period
    next_meds = []
    
    for med in medications:
        # Check custom times first
        if med.custom_reminder_times:
            try:
                custom_times = json.loads(med.custom_reminder_times)
                for time_str in custom_times:
                    hour, minute = map(int, time_str.split(':'))
                    scheduled_time = dt_time(hour, minute)
                    
                    # If this time is now or coming soon (within 15 min)
                    time_diff = datetime.combine(now.date(), scheduled_time) - datetime.combine(now.date(), current_time)
                    if -900 <= time_diff.total_seconds() <= 900:  # ±15 minutes
                        next_meds.append((med, time_diff.total_seconds()))
            except:
                pass
        
        # Check period-based times
        for period, (start, end) in periods.items():
            if getattr(med, period, False):
                # If we're in this period now
                if start <= current_time <= end:
                    time_diff = 0
                    next_meds.append((med, time_diff))
                    break
    
    # If we found medications for current time, return highest priority
    if next_meds:
        # Sort by time difference (closest first), then priority
        priority_map = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'normal': 2}
        next_meds.sort(key=lambda x: (abs(x[1]), priority_map.get(x[0].priority, 2)))
        
        med = next_meds[0][0]
        return {
            'id': med.id,
            'name': med.name,
            'dosage': med.dosage,
            'has_barcode': bool(med.barcode),
            'has_reference_image': bool(med.reference_image_path),
            'verification_methods': ['barcode'] if med.barcode else [] + ['visual', 'ocr']
        }
    
    # No medication due right now, return first one as fallback
    if medications:
        med = medications[0]
        return {
            'id': med.id,
            'name': med.name,
            'dosage': med.dosage,
            'has_barcode': bool(med.barcode),
            'has_reference_image': bool(med.reference_image_path),
            'verification_methods': ['barcode'] if med.barcode else [] + ['visual', 'ocr']
        }
    
    return None
