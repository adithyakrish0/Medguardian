import cv2

class CameraInterface:
    def __init__(self, camera_id=0):
        self.camera = cv2.VideoCapture(camera_id)
        if not self.camera.isOpened():
            raise Exception("Could not open camera")
    
    def capture_image(self):
        """Capture a single frame from camera"""
        ret, frame = self.camera.read()
        if not ret:
            raise Exception("Failed to capture image")
        return frame
    
    def release(self):
        self.camera.release()
        cv2.destroyAllWindows()