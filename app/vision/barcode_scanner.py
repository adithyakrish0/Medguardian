import cv2

class BarcodeScanner:
    @staticmethod
    def scan_barcodes(image):
        """Scan barcodes/QR codes in image"""
        try:
            from pyzbar import pyzbar
            barcodes = pyzbar.decode(image)
        except (ImportError, FileNotFoundError, OSError):
            # Return empty list if pyzbar is not available
            return []
            
        results = []
        
        for barcode in barcodes:
            # Extract barcode data
            barcode_data = barcode.data.decode('utf-8')
            barcode_type = barcode.type
            
            # Get bounding box
            x, y, w, h = barcode.rect
            
            results.append({
                'data': barcode_data,
                'type': barcode_type,
                'bbox': (x, y, x+w, y+h)
            })
        
        return results