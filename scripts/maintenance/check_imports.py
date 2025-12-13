try:
    import cv2
    print("cv2 imported")
except Exception as e:
    print(f"cv2 failed: {e}")

try:
    from pyzbar import pyzbar
    print("pyzbar imported")
except Exception as e:
    print(f"pyzbar failed: {e}")

try:
    import torch
    print("torch imported")
except Exception as e:
    print(f"torch failed: {e}")
