import requests
import json

BASE_URL = "http://127.0.0.1:5000/api/v1"

def test_chat():
    session = requests.Session()
    
    # 1. Login
    print("Logging in...")
    login_resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": "demo_senior",
        "password": "demo123"
    })
    
    # 2. Chat
    print("\nTesting /api/v1/chat...")
    chat_resp = session.post(f"{BASE_URL}/chat", json={
        "message": "What medications am I taking and are there any interactions?",
        "history": []
    })
    
    data = chat_resp.json()
    print(f"Backend used: {data.get('backend')}")
    print(f"Response: {data.get('response')[:200]}...")
    if 'sources' in data:
        print(f"Sources found: {len(data['sources'])}")

if __name__ == "__main__":
    test_chat()
