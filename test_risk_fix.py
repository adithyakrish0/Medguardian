from app import create_app
from app.services.analytics_service import AnalyticsService
from app.models.auth import User

app = create_app()
with app.app_context():
    # User 9 is a caregiver, likely has 0 meds scheduled
    user_id = 9
    print(f"Testing Risk Score for User {user_id}...")
    try:
        score = AnalyticsService.calculate_risk_score(user_id)
        print(f"Risk Score: {score}")
    except Exception as e:
        print(f"Error calculating risk score: {e}")

    print("\nTesting Anomalies for User 8 (Amma)...")
    try:
        anom = AnalyticsService.analyze_risk_anomalies(8)
        print(f"Anomalies: {anom}")
    except Exception as e:
        print(f"Error analyzing anomalies: {e}")
