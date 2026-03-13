from app import create_app
from app.models.auth import User
from flask import current_app
import time

app = create_app()
with app.app_context():
    senior = User.query.filter_by(username='demo_senior').first()
    if not senior:
        print("Senior not found")
        exit(1)
    
    # Simulate get_seniors logic for a senior (expecting 403 in real API)
    # But here we measure the underlying service speed
    from app.services.analytics_service import analytics_service
    
    print("Measuring risk score calculation...")
    start = time.time()
    score = analytics_service.calculate_risk_score(senior.id)
    end = time.time()
    print(f"Risk Score: {score}, Time: {end-start:.4f}s")
    
    print("Measuring 7-day adherence history...")
    start = time.time()
    history = analytics_service.get_7_day_adherence(senior.id)
    end = time.time()
    print(f"History items: {len(history)}, Time: {end-start:.4f}s")
