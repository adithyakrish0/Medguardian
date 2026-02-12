from app import create_app
from app.services.analytics_service import AnalyticsService
import traceback
import sys

def test_user(user_id):
    print(f"\n{'='*20}")
    print(f"Testing User ID: {user_id}")
    print(f"{'='*20}")
    
    app = create_app()
    with app.app_context():
        print("\n1. Testing get_adherence_history...")
        try:
            history = AnalyticsService.get_adherence_history(user_id, 14)
            print("SUCCESS")
        except Exception:
            traceback.print_exc()

        print("\n2. Testing calculate_risk_score...")
        try:
            score = AnalyticsService.calculate_risk_score(user_id)
            print(f"SCORE: {score}")
        except Exception:
            traceback.print_exc()

        print("\n3. Testing analyze_risk_anomalies...")
        try:
            anomalies = AnalyticsService.analyze_risk_anomalies(user_id)
            print(f"ANOMALIES: {anomalies}")
        except Exception:
            traceback.print_exc()

if __name__ == "__main__":
    # Test for user 9 (Caregiver) and user 8 (Senior)
    test_user(9)
    test_user(8)
