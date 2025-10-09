from .pill_detection import PillDetector
from .camera_interface import CameraInterface
# Temporarily disable barcode scanning
# from .barcode_scanner import BarcodeScanner

class MedicationVerifier:
    def __init__(self):
        self.detector = PillDetector()
        self.camera = CameraInterface()
        self.scanner = None  # Initialize as None since barcode scanning is disabled
    
    def verify_medication(self, expected_medication_id):
        """Verify medication using camera directly"""
        try:
            # Capture image
            image = self.camera.capture_image()
            
            # Process image
            return self._process_image(image, expected_medication_id)
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Error: {str(e)}",
                'detected_bottles': 0,
                'barcode_verified': False
            }
    
    def verify_medication_with_image(self, image_path, expected_medication_id):
        """Verify medication using saved image file"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'success': False,
                    'message': "Could not load image",
                    'detected_bottles': 0,
                    'barcode_verified': False
                }
            
            # Process image
            return self._process_image(image, expected_medication_id)
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Error: {str(e)}",
                'detected_bottles': 0,
                'barcode_verified': False
            }
    
    def _process_image(self, image, expected_medication_id):
        """Process image for verification"""
        # Detect pill bottles
        bottles_detected, detections = self.detector.verify_medication(image)
        
        if not bottles_detected:
            return {
                'success': False,
                'message': "No pill bottles detected",
                'detected_bottles': 0,
                'barcode_verified': False
            }
        
        # Scan barcodes (if scanner is available)
        barcodes = []
        if self.scanner:
            barcodes = self.scanner.scan_barcodes(image)
        
        # Verify barcode matches expected medication
        barcode_verified = False
        for barcode in barcodes:
            if self._verify_barcode(barcode['data'], expected_medication_id):
                barcode_verified = True
                break
        
        return {
            'success': bottles_detected and barcode_verified,
            'message': "Verification successful" if barcode_verified else "Barcode mismatch or scanning disabled",
            'detected_bottles': len(detections),
            'barcode_verified': barcode_verified
        }
    
    def _verify_barcode(self, barcode_data, expected_medication_id):
        """Verify barcode matches expected medication"""
        expected_barcode = f"MED_{expected_medication_id}"
        return barcode_data == expected_barcode
    
    def cleanup(self):
        self.camera.release()
