"""
Phase 3: Visual Verification System
Uses image similarity and OCR when barcodes aren't available (most real-world cases)
"""
import cv2
import numpy as np
import json
from typing import Dict, Optional, Tuple
import os

class VisualMedicationVerifier:
    """Verify medications using visual features when no barcode exists"""
    
    def __init__(self):
        self.similarity_threshold = 0.75  # 75% similarity required
        
    def extract_features(self, image: np.ndarray) -> Dict:
        """
        Extract visual features from medication image
        Returns features that can identify the medication
        """
        features = {}
        
        # 1. Color Histogram (dominant colors)
        features['color_histogram'] = self._compute_color_histogram(image)
        
        # 2. Shape features (aspect ratio, size guidance)
        features['shape'] = self._extract_shape_features(image)
        
        # 3. Text regions (where labels might be)
        features['text_regions'] = self._detect_text_regions(image)
        
        return features
    
    def _compute_color_histogram(self, image: np.ndarray) -> list:
        """Compute normalized color histogram (identifies bottle by color)"""
        # Convert to HSV (better for color identification)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Compute histogram for each channel
        h_hist = cv2.calcHist([hsv], [0], None, [50], [0, 180])  # Hue
        s_hist = cv2.calcHist([hsv], [1], None, [32], [0, 256])  # Saturation
        v_hist = cv2.calcHist([hsv], [2], None, [32], [0, 256])  # Value
        
        # Normalize
        h_hist = cv2.normalize(h_hist, h_hist).flatten()
        s_hist = cv2.normalize(s_hist, s_hist).flatten()
        v_hist = cv2.normalize(v_hist, v_hist).flatten()
        
        # Combine and convert to list for JSON storage
        combined = np.concatenate([h_hist, s_hist, v_hist])
        return combined.tolist()
    
    def _extract_shape_features(self, image: np.ndarray) -> Dict:
        """Extract shape/size features"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest contour (likely the bottle)
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            
            return {
                'aspect_ratio': float(w / h) if h > 0 else 0,
                'area': int(cv2.contourArea(largest)),
                'perimeter': int(cv2.arcLength(largest, True))
            }
        
        return {'aspect_ratio': 0, 'area': 0, 'perimeter': 0}
    
    def _detect_text_regions(self, image: np.ndarray) -> list:
        """Detect regions where text might appear"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Use edge detection to find text regions
        edges = cv2.Canny(gray, 50, 150)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated = cv2.dilate(edges, kernel, iterations=2)
        
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        text_regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter based on typical text region dimensions
            if 20 < w < 200 and 10 < h < 100:
                text_regions.append({'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)})
        
        return text_regions[:5]  # Return top 5 text regions
    
    def compare_images(self, stored_features: Dict, current_image: np.ndarray) -> float:
        """
        Compare stored medication features with current image
        Returns similarity score 0-1 (1 = perfect match)
        """
        # Extract features from current image
        current_features = self.extract_features(current_image)
        
        # Compare color histograms
        stored_hist = np.array(stored_features['color_histogram'])
        current_hist = np.array(current_features['color_histogram'])
        
        # Use correlation for histogram comparison
        color_similarity = cv2.compareHist(
            stored_hist.astype(np.float32),
            current_hist.astype(np.float32),
            cv2.HISTCMP_CORREL
        )
        
        # Compare shape features
        stored_shape = stored_features['shape']
        current_shape = current_features['shape']
        
        # Aspect ratio similarity
        if stored_shape['aspect_ratio'] > 0 and current_shape['aspect_ratio'] > 0:
            ratio_diff = abs(stored_shape['aspect_ratio'] - current_shape['aspect_ratio'])
            shape_similarity = max(0, 1 - ratio_diff)
        else:
            shape_similarity = 0.5  # Neutral if can't compare
        
        # Weighted average (color is more important)
        overall_similarity = (color_similarity * 0.7) + (shape_similarity * 0.3)
        
        return float(overall_similarity)
    
    def extract_text_ocr(self, image: np.ndarray) -> str:
        """
        Extract text from medication label using OCR
        Returns recognized text
        """
        try:
            import pytesseract
            
            # Preprocess image for better OCR
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Increase contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(enhanced)
            
            # OCR
            text = pytesseract.image_to_string(denoised, config='--psm 6')
            
            return text.strip()
            
        except ImportError:
            print("pytesseract not installed - OCR unavailable")
            return ""
        except Exception as e:
            print(f"OCR error: {e}")
            return ""
    
    def verify_by_text(self, expected_name: str, extracted_text: str) -> Tuple[bool, float]:
        """
        Verify medication by matching name in extracted text
        Returns (is_match, confidence)
        """
        if not extracted_text:
            return False, 0.0
        
        # Normalize
        expected_lower = expected_name.lower()
        text_lower = extracted_text.lower()
        
        # Direct match
        if expected_lower in text_lower:
            return True, 1.0
        
        # Fuzzy match (handles OCR errors)
        # Simple implementation: check if most characters match
        expected_chars = set(expected_lower.replace(' ', ''))
        text_chars = set(text_lower.replace(' ', ''))
        
        if expected_chars:
            overlap = len(expected_chars & text_chars) / len(expected_chars)
            if overlap > 0.7:  # 70% character overlap
                return True, overlap
        
        return False, 0.0
    
    def save_reference_image(self, image: np.ndarray, medication_id: int, base_path: str = 'app/static/reference_images') -> str:
        """Save reference image for a medication"""
        os.makedirs(base_path, exist_ok=True)
        filename = f"med_{medication_id}_reference.jpg"
        filepath = os.path.join(base_path, filename)
        cv2.imwrite(filepath, image)
        return filepath

# Global instance
visual_verifier = VisualMedicationVerifier()
