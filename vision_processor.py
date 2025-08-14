# Update vision_processor.py to use the trained model
import cv2
from ultralytics import YOLO
from datetime import datetime

class VisionProcessor:
    def __init__(self):
        # Load the trained model
        self.model = YOLO('runs/detect/medicine_bottle_detector/weights/best.pt')
        
    def process_frame(self, frame, session_id):
        # Run inference
        results = self.model(frame, verbose=False)
        
        # Process results
        events = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Extract detection info
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = box.conf[0].cpu().numpy()
                class_id = int(box.cls[0].cpu().numpy())
                
                # Only keep high-confidence detections
                if confidence > 0.7:
                    # Create event
                    event = {
                        'type': "bottle_detected",
                        'timestamp': datetime.now(),
                        'confidence': float(confidence),
                        'box': [int(x1), int(y1), int(x2), int(y2)]
                    }
                    events.append(event)
        
        return events