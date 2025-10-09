import torch
import cv2
import numpy as np
from PIL import Image
import os

class PillDetector:
    def __init__(self):
        """Initialize the pill detector with fallback to basic image processing"""
        self.model = self._load_model()
        self.confidence_threshold = 0.5
    
    def _load_model(self):
        """Attempt to load YOLOv5 model, fallback to None if unavailable"""
        try:
            # Try loading YOLOv5 model with error handling
            self.model = torch.hub.load('ultralytics/yolov5', 'custom', path='yolov5s.pt')
            return self.model
        except Exception as e:
            print(f"YOLOv5 model loading failed: {e}")
            print("Using fallback detection method")
            return None
    
    def detect_pills(self, image):
        """
        Detect pills/bottles in the given image
        Returns: list of bounding boxes in format [x1, y1, x2, y2, confidence, class]
        """
        if self.model is not None:
            return self._yolo_detection(image)
        else:
            return self._fallback_detection(image)
    
    def _yolo_detection(self, image):
        """Use YOLOv5 model for detection"""
        try:
            # Convert PIL Image to numpy array if needed
            if isinstance(image, Image.Image):
                image = np.array(image)
            
            # Run inference
            results = self.model(image)
            
            # Extract detections
            detections = results.xyxy[0].cpu().numpy()
            
            # Filter by confidence
            detections = detections[detections[:, 4] > self.confidence_threshold]
            
            return detections.tolist()
        except Exception as e:
            print(f"YOLO detection error: {e}")
            return self._fallback_detection(image)
    
    def _fallback_detection(self, image):
        """
        Basic pill/bottle detection using image processing
        Uses contour detection and size filtering
        """
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            image = np.array(image)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply threshold
        _, thresh = cv2.threshold(blurred, 60, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        detections = []
        for contour in contours:
            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter small objects and aspect ratios
            if w > 30 and h > 30 and w > h * 0.5 and w < h * 2:
                # Convert to [x1, y1, x2, y2, confidence, class] format
                x1, y1, x2, y2 = x, y, x + w, y + h
                confidence = 0.7  # Fixed confidence for fallback
                class_id = 0     # Fixed class for fallback
                detections.append([x1, y1, x2, y2, confidence, class_id])
        
        return detections
    
    def verify_medication(self, image):
        """
        Verify medication and return detection results
        Returns: (bottles_detected, detections)
        """
        detections = self.detect_pills(image)
        bottles_detected = len(detections) > 0
        return bottles_detected, detections
    
    def draw_detections(self, image, detections):
        """
        Draw bounding boxes on the image
        Returns: annotated image
        """
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            img = np.array(image)
        else:
            img = image.copy()
        
        # Draw each detection
        for detection in detections:
            x1, y1, x2, y2, confidence, class_id = map(int, detection[:6])
            
            # Draw rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw label
            label = f"Pill: {confidence:.2f}"
            cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return img
    
    def count_pills(self, image):
        """
        Count the number of pills/bottles detected
        Returns: count and detailed information
        """
        detections = self.detect_pills(image)
        count = len(detections)
        
        # Calculate total area covered
        total_area = 0
        for detection in detections:
            x1, y1, x2, y2 = detection[:4]
            area = (x2 - x1) * (y2 - y1)
            total_area += area
        
        image_area = image.shape[0] * image.shape[1] if hasattr(image, 'shape') else 64000
        coverage_percentage = (total_area / image_area) * 100
        
        return {
            'count': count,
            'total_area': total_area,
            'coverage_percentage': coverage_percentage,
            'detections': detections
        }
