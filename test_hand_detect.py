import requests

def test_detect_hand_cors():
    url = "http://127.0.0.1:5000/api/v1/detect-hand"
    
    # Test OPTIONS preflight
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
    
    print("Testing OPTIONS preflight...")
    response = requests.options(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
    
    # Test POST with fake image
    print("\nTesting POST request...")
    post_headers = {
        "Origin": "http://localhost:3000",
        "Content-Type": "application/json"
    }
    payload = {
        "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg==" # Dummy base64
    }
    
    try:
        response = requests.post(url, json=payload, headers=post_headers)
        print(f"Status: {response.status_code}")
        print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_detect_hand_cors()
