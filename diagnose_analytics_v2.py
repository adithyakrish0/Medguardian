from app import create_app
from app.services.analytics_service import AnalyticsService
from app.models.relationship import CaregiverSenior
from app.models.auth import User

app = create_app()
with app.app_context():
    # TEST FOR CAREGIVER 9 (who is linked to senior 8)
    caregiver_id = 9
    relations = CaregiverSenior.query.filter_by(caregiver_id=caregiver_id, status='accepted').all()
    
    for rel in relations:
        senior = User.query.get(rel.senior_id)
        print(f"\n--- Analytics for Senior {senior.id} ({senior.username}) ---")
        data = AnalyticsService.get_adherence_history(senior.id, 7)
        for d in data:
            print(f"{d['date']} ({d['full_date']}): Adh={d['adherence']}%, Exp={d['expected']}, Taken={d['taken']}, Missed={d['missed']}, Locked={d['isLocked']}")
