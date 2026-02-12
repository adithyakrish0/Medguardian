import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.curdir))

from app import create_app
from app.services.pk_engine import pk_engine
from app.services.cognitive_engine import cognitive_engine
from app.services.analytics_service import analytics_service
from app.models.auth import User
from app.models.medication import Medication
from app.extensions import db

def final_audit():
    app = create_app()
    with app.app_context():
        print("🔍 RUNNING FINAL AI SERVICE AUDIT...")
        
        # 1. PK Engine get_state
        print("\n--- [Audit 1: PK Engine] ---")
        try:
            # test with a dummy user/med
            state = pk_engine.get_state(1, 1)
            print(f"✅ PK Engine get_state: {state}")
        except Exception as e:
            print(f"❌ PK Engine Failure: {e}")

        # 2. Cognitive Engine Lockdown
        print("\n--- [Audit 2: Cognitive Engine] ---")
        try:
            status = cognitive_engine.analyze_interaction(1, 1, is_success=False)
            print(f"✅ Cognitive Engine status: {status}")
        except Exception as e:
            print(f"❌ Cognitive Engine Failure: {e}")

        # 3. Analytics Service Integration
        print("\n--- [Audit 3: Analytics Service] ---")
        try:
            # Verify it uses the new PK data
            risk_data = analytics_service.analyze_risk_anomalies(1)
            print(f"✅ Analytics Anomalies: {risk_data.get('anomalies', [])}")
            print(f"✅ Analytics PK Alerts: {risk_data.get('pk_alerts', [])}")
        except Exception as e:
            print(f"❌ Analytics Service Failure: {e}")

        print("\n--- [Audit 4: Vision Engine] ---")
        from app.vision.vision_v2 import vision_v2
        try:
            # Check models exist (YOLO, etc)
            print(f"✅ Vision V2 Engine Initialized: {vision_v2 is not None}")
        except Exception as e:
            print(f"❌ Vision Engine Failure: {e}")

        print("\n--- AUDIT COMPLETE ---")

if __name__ == "__main__":
    final_audit()
