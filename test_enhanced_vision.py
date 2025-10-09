import cv2
import numpy as np
import time
import os
import json
from app.vision.enhanced_verifier import EnhancedMedicationVerifier
from app.vision.bottle_detector import MedicineBottleDetector

def test_enhanced_vision_system():
    """
    Comprehensive test of the enhanced vision system for medicine bottle detection
    """
    print("🧪 Testing Enhanced Vision System")
    print("=" * 50)
    
    # Test 1: Initialize the enhanced verifier
    print("\n1. Testing Enhanced Medication Verifier Initialization...")
    try:
        verifier = EnhancedMedicationVerifier(camera_id=0)
        print("✅ Enhanced verifier initialized successfully")
        print(f"   Camera info: {verifier.camera.get_camera_info()}")
    except Exception as e:
        print(f"❌ Failed to initialize verifier: {e}")
        return
    
    # Test 2: Test bottle detector with sample images
    print("\n2. Testing Bottle Detector...")
    detector = MedicineBottleDetector()
    
    # Create test images if none available
    test_images = create_test_images()
    
    for i, test_image in enumerate(test_images):
        print(f"   Testing image {i+1}...")
        try:
            bottles_detected, detections, annotated_image = detector.detect_bottles(
                test_image, return_image=True
            )
            
            print(f"   - Bottles detected: {bottles_detected}")
            print(f"   - Detections count: {len(detections)}")
            
            if bottles_detected:
                positions = detector.get_bottle_positions(test_image)
                print(f"   - Bottle positions: {len(positions)}")
                
                # Save annotated image
                cv2.imwrite(f"test_bottle_detection_{i}.jpg", annotated_image)
                print(f"   - Saved annotated image: test_bottle_detection_{i}.jpg")
            
        except Exception as e:
            print(f"   ❌ Error in bottle detection: {e}")
    
    # Test 3: Test single medication verification
    print("\n3. Testing Single Medication Verification...")
    try:
        result = verifier.verify_medication(expected_medication_id=1, capture_mode="single")
        
        print(f"   - Success: {result['success']}")
        print(f"   - Message: {result['message']}")
        print(f"   - Bottles detected: {result['detected_bottles']}")
        print(f"   - Detection time: {result['detection_time']:.2f}s")
        
        if result['success']:
            print("   ✅ Medication verification successful")
            # Save result
            verifier.save_detection_result(result, "test_results")
        else:
            print("   ❌ Medication verification failed")
            
    except Exception as e:
        print(f"   ❌ Error in medication verification: {e}")
    
    # Test 4: Test multiple image capture
    print("\n4. Testing Multiple Image Capture...")
    try:
        result = verifier.verify_medication(expected_medication_id=1, capture_mode="multiple")
        
        print(f"   - Success: {result['success']}")
        print(f"   - Message: {result['message']}")
        print(f"   - Bottles detected: {result['detected_bottles']}")
        print(f"   - Detection time: {result['detection_time']:.2f}s")
        
    except Exception as e:
        print(f"   ❌ Error in multiple image capture: {e}")
    
    # Test 5: Test real-time detection (briefly)
    print("\n5. Testing Real-time Detection (5 seconds)...")
    try:
        detection_results = []
        
        def detection_callback(result, image):
            detection_results.append(result)
            print(f"   - Detection: {result['message']} ({result['detected_bottles']} bottles)")
        
        # Start real-time detection
        verifier.start_realtime_detection(callback=detection_callback, fps=2)
        time.sleep(5)  # Run for 5 seconds
        verifier.stop_realtime_detection()
        
        print(f"   - Total detections: {len(detection_results)}")
        successful_detections = sum(1 for r in detection_results if r['success'])
        print(f"   - Successful detections: {successful_detections}")
        
    except Exception as e:
        print(f"   ❌ Error in real-time detection: {e}")
    
    # Test 6: Performance metrics
    print("\n6. Performance Metrics...")
    metrics = verifier.get_performance_metrics()
    
    print(f"   - Total detections: {metrics['total_detections']}")
    print(f"   - Successful detections: {metrics['successful_detections']}")
    print(f"   - Success rate: {metrics['success_rate']:.1f}%")
    print(f"   - Average detection time: {metrics['average_detection_time']:.2f}s")
    print(f"   - Model loaded: {metrics['model_loaded']}")
    print(f"   - Barcode scanning enabled: {metrics['barcode_scanning_enabled']}")
    
    # Test 7: Cleanup
    print("\n7. Testing Cleanup...")
    try:
        verifier.cleanup()
        print("✅ Cleanup completed successfully")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    
    print("\n🎉 Enhanced Vision System Test Completed")
    print("=" * 50)

def create_test_images():
    """
    Create test images with simulated medicine bottles for testing
    """
    test_images = []
    
    # Test 1: Simple bottle shape
    img1 = np.zeros((400, 600, 3), dtype=np.uint8)
    cv2.rectangle(img1, (100, 150), (200, 350), (0, 255, 0), -1)  # Green bottle
    cv2.rectangle(img1, (300, 200), (400, 300), (255, 255, 0), -1)  # Cyan pill
    test_images.append(img1)
    
    # Test 2: Multiple bottles
    img2 = np.zeros((500, 700, 3), dtype=np.uint8)
    cv2.rectangle(img2, (50, 100), (150, 300), (0, 0, 255), -1)  # Red bottle
    cv2.rectangle(img2, (200, 150), (300, 250), (255, 0, 255), -1)  # Magenta capsule
    cv2.rectangle(img2, (350, 120), (450, 280), (0, 255, 255), -1)  # Yellow tablet
    test_images.append(img2)
    
    # Test 3: Complex scene
    img3 = np.zeros((600, 800, 3), dtype=np.uint8)
    # Background
    cv2.rectangle(img3, (0, 0), (800, 600), (128, 128, 128), -1)
    
    # Bottles of different sizes and colors
    cv2.rectangle(img3, (100, 200), (180, 400), (0, 255, 0), -1)  # Large green bottle
    cv2.rectangle(img3, (250, 250), (320, 350), (255, 255, 0), -1)  # Medium yellow pill
    cv2.rectangle(img3, (400, 180), (470, 380), (255, 0, 255), -1)  # Medium magenta capsule
    cv2.rectangle(img3, (550, 220), (600, 320), (0, 255, 255), -1)  # Small white tablet
    
    test_images.append(img3)
    
    print(f"Created {len(test_images)} test images for bottle detection")
    return test_images

def test_camera_interface():
    """
    Test the enhanced camera interface specifically
    """
    print("\n📹 Testing Enhanced Camera Interface")
    print("=" * 40)
    
    try:
        camera = EnhancedCameraInterface(camera_id=0)
        
        # Test camera info
        info = camera.get_camera_info()
        print(f"Camera info: {info}")
        
        # Test image capture
        print("Testing image capture...")
        image = camera.capture_image(timeout=3.0)
        
        if image is not None:
            print(f"✅ Image captured successfully - Shape: {image.shape}")
            
            # Save test image
            cv2.imwrite("test_camera_capture.jpg", image)
            print("Saved test image: test_camera_capture.jpg")
        else:
            print("❌ Failed to capture image")
        
        # Test camera preview (briefly)
        print("Testing camera preview (3 seconds)...")
        preview_frames = []
        
        def preview_callback(frame):
            preview_frames.append(frame)
        
        camera.start_preview(callback=preview_callback, fps=10)
        time.sleep(3)
        camera.stop_preview()
        
        print(f"Preview frames captured: {len(preview_frames)}")
        
        # Test multiple capture
        print("Testing multiple image capture...")
        images = camera.capture_multiple_images(count=3, delay=0.5)
        print(f"Captured {len(images)} images")
        
        camera.release()
        print("✅ Camera interface test completed")
        
    except Exception as e:
        print(f"❌ Camera interface test failed: {e}")

def test_bottle_detector_alone():
    """
    Test the bottle detector independently
    """
    print("\n🔍 Testing Bottle Detector Independently")
    print("=" * 45)
    
    try:
        detector = MedicineBottleDetector()
        
        # Create test images
        test_images = create_test_images()
        
        for i, test_image in enumerate(test_images):
            print(f"\nTesting image {i+1}...")
            
            # Test detection
            bottles_detected, detections, annotated_image = detector.detect_bottles(
                test_image, return_image=True
            )
            
            print(f"- Bottles detected: {bottles_detected}")
            print(f"- Detection count: {len(detections)}")
            
            if bottles_detected:
                # Test positions
                positions = detector.get_bottle_positions(test_image)
                print(f"- Bottle positions: {len(positions)}")
                
                for pos in positions:
                    print(f"  - Center: {pos['center']}, Area: {pos['area']}")
                
                # Save annotated image
                cv2.imwrite(f"bottle_detection_test_{i}.jpg", annotated_image)
                print(f"- Saved annotated image: bottle_detection_test_{i}.jpg")
            
            # Test fallback detection
            if not bottles_detected:
                print("- No bottles detected, testing fallback method...")
                fallback_detections = detector._detect_with_fallback(test_image)
                print(f"- Fallback detections: {len(fallback_detections)}")
        
        print("\n✅ Bottle detector test completed")
        
    except Exception as e:
        print(f"❌ Bottle detector test failed: {e}")

def main():
    """
    Main test function
    """
    print("🚀 Starting Enhanced Vision System Tests")
    print("=" * 60)
    
    # Run individual tests
    test_camera_interface()
    test_bottle_detector_alone()
    test_enhanced_vision_system()
    
    print("\n🎯 All tests completed!")
    print("Check the generated images for visual verification:")
    print("- test_camera_capture.jpg")
    print("- bottle_detection_test_*.jpg")
    print("- test_bottle_detection_*.jpg")
    print("- test_results/ directory for detection results")

if __name__ == "__main__":
    main()
