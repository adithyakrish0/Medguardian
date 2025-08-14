from ultralytics import YOLO
import cv2

# Load pre-trained YOLOv8 model
model = YOLO('yolov8n.pt')

# Try to find DroidCam camera (usually it's camera index 1 or higher)
# You may need to test different indices
camera_index = 1  # Try 0, 1, 2, etc. until you find the right one

# Initialize camera
cap = cv2.VideoCapture(camera_index)

if not cap.isOpened():
    print(f"Cannot open camera with index {camera_index}")
    exit()

print("Camera opened successfully. Press 'q' to quit.")

while True:
    # Read a frame from the camera
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Run YOLOv8 inference on the frame
    results = model(frame, verbose=False)

    # Process the results
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # Get class ID and name
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            
            # Only process bottles
            if class_name == 'bottle':
                # Get bounding box coordinates and confidence
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = box.conf[0].cpu().numpy()
                
                # Draw bounding box and label
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(frame, f"Bottle {confidence:.2f}", (int(x1), int(y1)-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    # Display the frame
    cv2.imshow('MedGuardian - Bottle Detection', frame)

    # Break the loop if 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()