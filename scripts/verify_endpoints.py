import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api/v1"

def test_api():
    session = requests.Session()
    
    print("\nStarting API verification...")
    
    # 1. Login to get session
    print("1. Logging in as demo_senior...")
    login_resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": "demo_senior",
        "password": "demo123"
    })
    if login_resp.status_code != 200:
        print(f"FAILED: Login failed with {login_resp.status_code}")
        print(login_resp.text)
        return
    print("SUCCESS: Logged in.")
    user_id = login_resp.json()['user']['id']

    # 2. GET /medications
    print("\n2. GET /api/v1/medications")
    meds_resp = session.get(f"{BASE_URL}/medications")
    print(json.dumps(meds_resp.json(), indent=2))

    # 3. GET /analytics/adherence?days=30
    print("\n3. GET /api/v1/analytics/adherence?days=30")
    analytics_resp = session.get(f"{BASE_URL}/analytics/adherence?days=30")
    print(json.dumps(analytics_resp.json(), indent=2))

    # 4. POST /anomaly/detect
    print("\n4. POST /api/v1/anomaly/detect")
    anomaly_resp = session.post(f"{BASE_URL}/anomaly/detect", json={
        "patient_id": user_id
    })
    print(json.dumps(anomaly_resp.json(), indent=2))

    # 5. GET /explain/prediction/<patient_id>
    print(f"\n5. GET /api/v1/explain/prediction/{user_id}")
    explain_resp = session.get(f"{BASE_URL}/explain/prediction/{user_id}")
    # Truncate waterfall plot base64 for readability
    data = explain_resp.json()
    if 'waterfall_plot' in data:
        data['waterfall_plot'] = data['waterfall_plot'][:50] + "..."
    print(json.dumps(data, indent=2))

    # 6. POST /interactions/check
    print("\n6. POST /api/v1/interactions/check")
    ix_resp = session.post(f"{BASE_URL}/interactions/check", json={
        "medications": ["Metformin", "Lisinopril", "Aspirin"]
    })
    print(json.dumps(ix_resp.json(), indent=2))

if __name__ == "__main__":
    test_api()
