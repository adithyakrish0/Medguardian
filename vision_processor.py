import cv2
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from bottle_tracker import BottleTracker
from hand_tracker import HandTracker

class VisionProcessor:
    def __init__(self, camera_index=1):
        # Load pre-trained YOLOv8 model
        self.model = YOLO('yolov8n.pt')
        
        # Initialize trackers
        self.bottle_tracker = BottleTracker()
        self.hand_tracker = HandTracker()
        
        # Initialize camera
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            raise Exception(f"Cannot open camera with index {camera_index}")
        
        # For skin detection (for hand tracking)
        self.lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        self.upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        
    def process_frame(self, session_id=None):
        """Process a single frame and return events"""
        # Read a frame from the camera
        ret, frame = self.cap.read()
        if not ret:
            return None, None
        
        # Create a copy for drawing
        display_frame = frame.copy()
        
        # Convert to HSV for skin detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Detect skin
        skin_mask = cv2.inRange(hsv, self.lower_skin, self.upper_skin)
        
        # Track hands
        hands = self.hand_tracker.track(frame, skin_mask)
        
        # Run YOLOv8 inference on the frame
        results = self.model(frame, verbose=False)
        
        # Process the results to get bottle detections
        bottle_detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                
                # Only process bottles with high confidence
                if class_name == 'bottle' and box.conf[0].cpu().numpy() > 0.5:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    
                    bottle_detections.append({
                        'position': (int(x1), int(y1)),
                        'size': (int(x2-x1), int(y2-y1)),
                        'confidence': float(confidence),
                        'state': 'unknown'
                    })
                    
                    # Draw bounding box and label
                    cv2.rectangle(display_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    cv2.putText(display_frame, f"Bottle {confidence:.2f}", (int(x1), int(y1)-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Track bottles using the bottle tracker
        tracked_bottles = self.bottle_tracker.track(frame, skin_mask, hands, bottle_detections)
        
        # Draw tracked bottles
        for bottle in tracked_bottles:
            x, y = bottle['position']
            w, h = bottle['size']
            
            # Draw bottle with state-based color
            if bottle['state'] == 'open':
                color = (0, 0, 255)  # Red for open
            else:
                color = (255, 0, 0)  # Blue for closed
                
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(display_frame, f"{bottle['state']} {bottle['confidence']:.2f}", 
                       (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Draw hands
        for hand in hands:
            x, y = hand['center']
            r = hand['radius']
            cv2.circle(display_frame, (x, y), r, (0, 255, 255), 2)
        
        # Generate events based on bottle states and hand interactions
        events = []
        for bottle in tracked_bottles:
            if bottle.get('state_changed', False):
                events.append({
                    'type': f"bottle_{bottle['state']}",
                    'timestamp': datetime.now(),
                    'confidence': bottle['confidence'],
                    'position': bottle['position']
                })
        
        return display_frame, events
    
    def release(self):
        """Release resources"""
        self.cap.release()
        cv2.destroyAllWindows()