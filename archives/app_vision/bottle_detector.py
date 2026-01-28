try:
    import torch
except ImportError:
    torch = None
import cv2
import numpy as np
from PIL import Image
import os
import time
from typing import List, Dict, Tuple, Optional
from app.vision.model_manager import model_manager

class MedicineBottleDetector:
    """
    Advanced medicine bottle detection system using multiple computer vision techniques
    Now optimized with shared ModelManager to prevent redundant model loading
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the medicine bottle detector
        
        Args:
            model_path: Optional path to custom YOLO model (uses ModelManager's cached model)
        """
        self.model_path = model_path or 'yolov5s.pt'
        self.confidence_threshold = 0.65  # Increased from 0.5 to reduce false positives
        self.nms_threshold = 0.4
        self.min_detection_area = 3000  # Minimum bbox area in pixels to filter tiny detections
        self.max_input_size = 416  # Resize input for faster inference (was 640)
        
        # Target classes with confidence weights
        # Generic "bottle" class is penalized - too many false positives
        # Medical-specific classes get full trust
        self.target_classes = {
            'bottle': 0.7,      # Penalized - too generic, catches water bottles etc.
            'pill': 1.0,        # Full trust - medical specific
            'medicine': 1.0,    # Full trust - medical specific
            'tablet': 1.0,      # Full trust - medical specific  
            'capsule': 1.0,     # Full trust - medical specific
            'cup': 0.5,         # Low trust - often false positive
            'vase': 0.5,        # Low trust - often false positive
        }
        self.target_class_names = list(self.target_classes.keys())
        
        # Initialize fallback detection parameters
        self.fallback_params = {
            'min_contour_area': 1000,  # Increased from 500
            'max_contour_area': 50000,
            'aspect_ratio_range': (0.3, 3.0),
            'color_thresholds': {
                'green': ([40, 40, 40], [80, 255, 255]),
                'blue': ([100, 40, 40], [130, 255, 255]),
                'red': ([0, 40, 40], [10, 255, 255]),
                'white': ([0, 0, 200], [180, 30, 255])
            }
        }
    
    @property
    def model(self):
        """Get YOLO model from ModelManager (lazy loading, cached)"""
        try:
            return model_manager.get_yolo_model(self.model_path)
        except Exception as e:
            print(f"Failed to load YOLO model: {e}")
            return None
    
    def detect_bottles(self, image: np.ndarray, return_image: bool = False) -> Tuple[bool, List, Optional[np.ndarray]]:
        """
        Detect medicine bottles in the given image
        
        Args:
            image: Input image as numpy array
            return_image: Whether to return image with detections drawn
            
        Returns:
            Tuple of (bottles_detected, detections, annotated_image)
        """
        detections = []
        annotated_image = image.copy() if return_image else None
        
        # Only use YOLO - fallback contour detection causes too many false positives
        if self.model is not None:
            detections = self._detect_with_yolo(image, annotated_image)
        else:
            # Don't use fallback - it detects everything as bottles
            print("⚠️ YOLO model not available, skipping detection")
            detections = []
        
        bottles_detected = len(detections) > 0
        
        if return_image and annotated_image is not None:
            annotated_image = self._draw_detections(annotated_image, detections)
        
        return bottles_detected, detections, annotated_image
    
    def _detect_with_yolo(self, image: np.ndarray, annotated_image: Optional[np.ndarray] = None) -> List:
        """Detect bottles using YOLO model"""
        try:
            # Resize for faster inference
            h, w = image.shape[:2]
            scale = min(self.max_input_size / w, self.max_input_size / h, 1.0)
            if scale < 1.0:
                resized = cv2.resize(image, None, fx=scale, fy=scale)
            else:
                resized = image
                scale = 1.0
            
            # Run inference on resized image
            results = self.model(resized)
            
            # Extract detections
            detections = results.xyxy[0].cpu().numpy()
            
            # Filter by confidence, class, and size
            filtered_detections = []
            for detection in detections:
                x1, y1, x2, y2, confidence, class_id = detection
                
                # Scale coordinates back to original size
                x1, y1, x2, y2 = x1/scale, y1/scale, x2/scale, y2/scale
                
                class_name = self.model.names[int(class_id)]
                
                # Calculate bounding box area
                area = (x2 - x1) * (y2 - y1)
                
                # Apply class-specific confidence weight
                # Generic classes like 'bottle' get penalized
                class_weight = self.target_classes.get(class_name, 0.5)
                adjusted_confidence = confidence * class_weight
                
                # Filter: adjusted confidence, class, and minimum size
                if (adjusted_confidence > self.confidence_threshold and 
                    class_name in self.target_class_names and
                    area >= self.min_detection_area):
                    filtered_detections.append([
                        float(x1), float(y1), float(x2), float(y2),
                        float(adjusted_confidence), int(class_id)  # Store adjusted confidence
                    ])
            
            # Apply Non-Maximum Suppression
            if len(filtered_detections) > 1:
                filtered_detections = self._apply_nms(filtered_detections)
            
            return filtered_detections
            
        except Exception as e:
            print(f"YOLO detection error: {e}")
            return []  # Don't use fallback - it causes too many false positives
    
    def _detect_with_fallback(self, image: np.ndarray, annotated_image: Optional[np.ndarray] = None) -> List:
        """Detect bottles using fallback computer vision methods"""
        detections = []
        
        # Convert to different color spaces for better detection
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Try different color-based detection methods
        color_masks = self._create_color_masks(hsv)
        
        for color_name, mask in color_masks.items():
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < self.fallback_params['min_contour_area'] or area > self.fallback_params['max_contour_area']:
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h if h > 0 else 0
                
                if (self.fallback_params['aspect_ratio_range'][0] <= aspect_ratio <= 
                    self.fallback_params['aspect_ratio_range'][1]):
                    
                    # Calculate confidence based on contour properties
                    confidence = min(0.9, area / 5000)  # Normalize confidence
                    
                    detections.append([x, y, x + w, y + h, confidence, 0])
        
        # Remove overlapping detections
        if len(detections) > 1:
            detections = self._apply_nms(detections)
        
        return detections
    
    def _create_color_masks(self, hsv_image: np.ndarray) -> Dict[str, np.ndarray]:
        """Create color-based masks for bottle detection"""
        masks = {}
        
        for color_name, (lower, upper) in self.fallback_params['color_thresholds'].items():
            mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
            
            # Apply morphological operations to clean up mask
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            
            masks[color_name] = mask
        
        return masks
    
    def _apply_nms(self, detections: List) -> List:
        """Apply Non-Maximum Suppression to remove overlapping detections"""
        if len(detections) <= 1:
            return detections
        
        # Convert to format expected by OpenCV
        boxes = []
        confidences = []
        
        for detection in detections:
            x1, y1, x2, y2, confidence, _ = detection
            boxes.append([x1, y1, x2 - x1, y2 - y1])
            confidences.append(confidence)
        
        boxes = np.array(boxes)
        confidences = np.array(confidences)
        
        # Apply NMS
        indices = cv2.dnn.NMSBoxes(boxes.tolist(), confidences.tolist(), 
                                 self.confidence_threshold, self.nms_threshold)
        
        # Filter detections
        filtered_detections = []
        for i in indices:
            idx = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i
            filtered_detections.append(detections[idx])
        
        return filtered_detections
    
    def _draw_detections(self, image: np.ndarray, detections: List) -> np.ndarray:
        """Draw bounding boxes and labels on image"""
        colors = {
            'bottle': (0, 255, 0),      # Green
            'pill': (255, 255, 0),      # Cyan
            'medicine': (255, 0, 255),  # Magenta
            'tablet': (0, 255, 255),    # Yellow
            'capsule': (255, 0, 0)      # Red
        }
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.6
        thickness = 2
        
        for detection in detections:
            x1, y1, x2, y2, confidence, class_id = detection
            
            # Get class name
            if self.model:
                class_name = self.model.names[class_id]
            else:
                class_name = 'bottle'  # Default fallback
            
            # Choose color
            color = colors.get(class_name, (255, 255, 255))
            
            # Draw bounding box
            cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), color, thickness)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, font, font_scale, thickness)[0]
            
            # Draw label background
            cv2.rectangle(image, (int(x1), int(y1) - label_size[1] - 10),
                         (int(x1) + label_size[0], int(y1)), color, -1)
            
            # Draw label text
            cv2.putText(image, label, (int(x1), int(y1) - 5),
                       font, font_scale, (255, 255, 255), thickness)
        
        return image
    
    def get_bottle_count(self, image: np.ndarray) -> int:
        """Get count of detected bottles"""
        bottles_detected, detections, _ = self.detect_bottles(image)
        return len(detections)
    
    def get_bottle_positions(self, image: np.ndarray) -> List[Dict]:
        """Get positions and properties of detected bottles"""
        bottles_detected, detections, _ = self.detect_bottles(image)
        
        positions = []
        for detection in detections:
            x1, y1, x2, y2, confidence, class_id = detection
            
            if self.model:
                class_name = self.model.names[class_id]
            else:
                class_name = 'bottle'
            
            positions.append({
                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                'confidence': float(confidence),
                'class': class_name,
                'center': ((int(x1) + int(x2)) // 2, (int(y1) + int(y2)) // 2),
                'area': int((x2 - x1) * (y2 - y1))
            })
        
        return positions
    
    def save_detection_image(self, image: np.ndarray, detections: List, output_path: str):
        """Save image with detections drawn"""
        annotated_image = self._draw_detections(image.copy(), detections)
        cv2.imwrite(output_path, annotated_image)
