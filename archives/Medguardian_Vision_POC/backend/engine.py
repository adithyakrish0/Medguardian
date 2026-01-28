import cv2
import numpy as np
import base64
import os
import json

class VisionEngine:
    def __init__(self, data_dir='data'):
        self.orb = cv2.ORB_create(nfeatures=1500)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        self.data_dir = data_dir
        self.templates = {} # name -> {descriptors, keypoints, shape}
        self.load_templates()

    def load_templates(self):
        """Load registered templates from disk"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        
        for filename in os.listdir(self.data_dir):
            if filename.endswith('.npz'):
                name = filename.replace('.npz', '')
                data = np.load(os.path.join(self.data_dir, filename))
                self.templates[name] = {
                    'descriptors': data['descriptors'],
                    'shape': data['shape']
                }
        print(f"Loaded {len(self.templates)} medicine templates.")

    def register(self, name, image_base64):
        """Extract features from a new medicine image and save"""
        # Decode image
        encoded_data = image_base64.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        # Detect features
        kp, des = self.orb.detectAndCompute(img, None)

        if des is not None:
            # Save to disk
            np.savez(os.path.join(self.data_dir, f"{name}.npz"), 
                     descriptors=des, 
                     shape=np.array(img.shape))
            
            self.templates[name] = {
                'descriptors': des,
                'shape': img.shape
            }
            return True
        return False

    def verify(self, frame_base64):
        """Match frame against all stored templates"""
        encoded_data = frame_base64.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        kp_frame, des_frame = self.orb.detectAndCompute(frame, None)
        
        if des_frame is None:
            return None

        best_match = None
        min_matches = 20 # Minimum good matches to consider a hit

        for name, template in self.templates.items():
            matches = self.bf.match(template['descriptors'], des_frame)
            matches = sorted(matches, key=lambda x: x.distance)
            
            # Simple thresholding
            good_matches = [m for m in matches if m.distance < 40]
            
            if len(good_matches) > min_matches:
                # We found a match! 
                # Note: In a real app we'd use findHomography for precise corners
                return {
                    'name': name,
                    'confidence': len(good_matches),
                    'status': 'MATCHED'
                }

        return None

# Singleton instance
engine = VisionEngine()
