import cv2
import numpy as np
import time
import os
import sys
import json

# Add the app directory to the path
sys.path.append('app')

from app.vision.bottle_detector import MedicineBottleDetector

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

def test_bottle_detector():
    """
    Test the bottle detector independently
    """
    print("🔍 Testing Bottle Detector")
    print("=" * 40)
    
    try:
        detector = MedicineBottleDetector()
        
        # Create test images
        test_images = create_test_images()
        
        total_detections = 0
        successful_detections = 0
        
        for i, test_image in enumerate(test_images):
            print(f"\n📸 Testing Image {i+1}...")
            
            # Test detection
            start_time = time.time()
            bottles_detected, detections, annotated_image = detector.detect_bottles(
                test_image, return_image=True
            )
            detection_time = time.time() - start_time
            
            total_detections += 1
            if bottles_detected:
                successful_detections += 1
            
            print(f"   ✓ Bottles detected: {bottles_detected}")
            print(f"   ✓ Detection count: {len(detections)}")
            print(f"   ✓ Detection time: {detection_time:.3f}s")
            
            if bottles_detected:
                # Test positions
                positions = detector.get_bottle_positions(test_image)
                print(f"   ✓ Bottle positions: {len(positions)}")
                
                for j, pos in enumerate(positions):
                    print(f"     - Bottle {j+1}: Center {pos['center']}, Area {pos['area']}")
                
                # Save annotated image
                output_path = f"bottle_detection_test_{i}.jpg"
                cv2.imwrite(output_path, annotated_image)
                print(f"   ✓ Saved annotated image: {output_path}")
                
                # Save detection data
                detection_data = {
                    'image_index': i,
                    'detection_time': detection_time,
                    'bottles_detected': bottles_detected,
                    'detection_count': len(detections),
                    'positions': positions,
                    'detections': detections
                }
                
                json_path = f"detection_data_{i}.json"
                with open(json_path, 'w') as f:
                    # Convert numpy arrays to lists for JSON serialization
                    serializable_data = make_json_serializable(detection_data)
                    json.dump(serializable_data, f, indent=2)
                print(f"   ✓ Saved detection data: {json_path}")
            
            else:
                print("   ⚠ No bottles detected, testing fallback method...")
                fallback_detections = detector._detect_with_fallback(test_image)
                print(f"   ✓ Fallback detections: {len(fallback_detections)}")
        
        # Performance summary
        success_rate = (successful_detections / total_detections) * 100
        print(f"\n📊 Performance Summary:")
        print(f"   Total tests: {total_detections}")
        print(f"   Successful detections: {successful_detections}")
        print(f"   Success rate: {success_rate:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Bottle detector test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_camera_simulation():
    """
    Test camera simulation with OpenCV
    """
    print("\n📹 Testing Camera Simulation")
    print("=" * 40)
    
    try:
        # Test 1: Create a simulated camera feed
        print("🎬 Creating simulated camera feed...")
        
        # Create a simple animation with moving objects
        height, width = 480, 640
        frames = []
        
        for frame_num in range(30):  # 30 frames
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Background
            cv2.rectangle(frame, (0, 0), (width, height), (50, 50, 100), -1)
            
            # Moving bottle
            x = 100 + (frame_num * 10) % 400
            y = 200 + int(50 * np.sin(frame_num * 0.2))
            cv2.rectangle(frame, (x, y), (x+80, y+120), (0, 255, 0), -1)
            cv2.putText(frame, "Medicine", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Moving pill
            x2 = 300 + (frame_num * 15) % 200
            y2 = 150 + int(30 * np.cos(frame_num * 0.3))
            cv2.circle(frame, (x2, y2), 20, (255, 255, 0), -1)
            cv2.putText(frame, "Pill", (x2-15, y2-30), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            
            frames.append(frame)
        
        print(f"✓ Created {len(frames)} frames for simulation")
        
        # Test 2: Process simulated frames
        detector = MedicineBottleDetector()
        simulation_results = []
        
        for i, frame in enumerate(frames):
            bottles_detected, detections, annotated_frame = detector.detect_bottles(frame, return_image=True)
            simulation_results.append({
                'frame': i,
                'bottles_detected': bottles_detected,
                'detection_count': len(detections),
                'detections': detections
            })
            
            if i % 10 == 0:  # Print progress every 10 frames
                print(f"   Processed frame {i+1}/{len(frames)} - Bottles: {bottles_detected}")
        
        # Analyze simulation results
        total_frames = len(simulation_results)
        frames_with_detections = sum(1 for r in simulation_results if r['bottles_detected'])
        detection_rate = (frames_with_detections / total_frames) * 100
        
        print(f"\n🎬 Simulation Results:")
        print(f"   Total frames: {total_frames}")
        print(f"   Frames with detections: {frames_with_detections}")
        print(f"   Detection rate: {detection_rate:.1f}%")
        
        # Save sample frames
        for i in [0, 14, 29]:  # Save first, middle, and last frames
            cv2.imwrite(f"simulation_frame_{i}.jpg", frames[i])
            cv2.imwrite(f"simulation_detection_{i}.jpg", 
                       detector._draw_detections(frames[i], simulation_results[i]['detections']))
        
        print("✓ Saved sample simulation frames")
        
        return True
        
    except Exception as e:
        print(f"❌ Camera simulation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def make_json_serializable(obj):
    """Convert numpy arrays and other non-serializable objects to JSON-friendly format"""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(make_json_serializable(item) for item in obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    else:
        return obj

def main():
    """
    Main test function
    """
    print("🚀 Starting Simple Vision System Test")
    print("=" * 60)
    
    test_results = []
    
    # Test 1: Bottle detector
    print("\n🧪 Test 1: Bottle Detection")
    bottle_test_result = test_bottle_detector()
    test_results.append(("Bottle Detection", bottle_test_result))
    
    # Test 2: Camera simulation
    print("\n🧪 Test 2: Camera Simulation")
    camera_test_result = test_camera_simulation()
    test_results.append(("Camera Simulation", camera_test_result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(test_results)} tests passed")
    
    if passed == len(test_results):
        print("\n🎉 All tests completed successfully!")
        print("\n📁 Generated files:")
        print("- bottle_detection_test_*.jpg (annotated detections)")
        print("- detection_data_*.json (detection results)")
        print("- simulation_frame_*.jpg (original frames)")
        print("- simulation_detection_*.jpg (annotated frames)")
    else:
        print(f"\n⚠️ {len(test_results) - passed} test(s) failed - check error messages above")
    
    print("\n🔧 Next steps:")
    print("1. Review generated images for visual verification")
    print("2. Check detection_data_*.json for detailed results")
    print("3. Test with real camera when dependencies are resolved")
    print("4. Integrate with main application")

if __name__ == "__main__":
    main()
