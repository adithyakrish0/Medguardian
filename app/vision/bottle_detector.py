import torch
import cv2
import numpy as np
from PIL import Image
import os
import time
from typing import List, Dict, Tuple, Optional

class MedicineBottleDetector:
    """
    Advanced medicine bottle detection system using multiple computer vision techniques
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the medicine bottle detector
        
        Args:
            model_path: Optional path to custom YOLO model
        """
        self.model = None
        self.confidence_threshold = 0.5
        self.nms_threshold = 0.4
        self.target_class_names = ['bottle', 'pill', 'medicine', 'tablet', 'capsule']
        
        # Try to load YOLO model
        self._load_model(model_path)
        
        # Initialize fallback detection parameters
        self.fallback_params = {
            'min_contour_area': 500,
            'max_contour_area': 50000,
            'aspect_ratio_range': (0.3, 3.0),
            'color_thresholds': {
                'green': ([40, 40, 40], [80, 255, 255]),
                'blue': ([100, 40, 40], [130, 255, 255]),
                'red': ([0, 40, 40], [10, 255, 255]),
                'white': ([0, 0, 200], [180, 30, 255])
            }
        }
    
    def _load_model(self, model_path: Optional[str] = None):
        """Load YOLO model with error handling"""
        try:
            if model_path and os.path.exists(model_path):
                # Load custom trained model
                self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
                print(f"Loaded custom model from {model_path}")
            else:
                # Load pre-trained model
                self.model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
                print("Loaded pre-trained YOLOv5s model")
                
                # Filter for relevant classes
                self.model.names = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus',
                                  'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
                                  'stop sign', 'parking meter', 'bench', 'bird', 'cat',
                                  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear',
                                  'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag',
                                  'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
                                  'sports ball', 'kite', 'baseball bat', 'baseball glove',
                                  'skateboard', 'surfboard', 'tennis racket', 'bottle',
                                  'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
                                  'banana', 'apple', 'sandwich', 'orange', 'broccoli',
                                  'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
                                  'couch', 'potted plant', 'bed', 'dining table', 'toilet',
                                  'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
                                  'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
                                  'book', 'clock', 'vase', 'scissors', 'teddy bear',
                                  'hair drier', 'toothbrush']
                
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            print("Using fallback detection method")
            self.model = None
    
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
        
        if self.model is not None:
            detections = self._detect_with_yolo(image, annotated_image)
        else:
            detections = self._detect_with_fallback(image, annotated_image)
        
        bottles_detected = len(detections) > 0
        
        if return_image and annotated_image is not None:
            annotated_image = self._draw_detections(annotated_image, detections)
        
        return bottles_detected, detections, annotated_image
    
    def _detect_with_yolo(self, image: np.ndarray, annotated_image: Optional[np.ndarray] = None) -> List:
        """Detect bottles using YOLO model"""
        try:
            # Run inference
            results = self.model(image)
            
            # Extract detections
            detections = results.xyxy[0].cpu().numpy()
            
            # Filter by confidence and class
            filtered_detections = []
            for detection in detections:
                x1, y1, x2, y2, confidence, class_id = detection
                class_name = self.model.names[int(class_id)]
                
                # Check if it's a relevant class
                if confidence > self.confidence_threshold and class_name in self.target_class_names:
                    filtered_detections.append([
                        float(x1), float(y1), float(x2), float(y2),
                        float(confidence), int(class_id)
                    ])
            
            # Apply Non-Maximum Suppression
            if len(filtered_detections) > 1:
                filtered_detections = self._apply_nms(filtered_detections)
            
            return filtered_detections
            
        except Exception as e:
            print(f"YOLO detection error: {e}")
            return self._detect_with_fallback(image, annotated_image)
    
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
    
    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, 'model') and self.model is not None:
            # Model cleanup if needed
            pass
