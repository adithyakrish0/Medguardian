from app import create_app
from app.services.analytics_service import AnalyticsService
from app.models.relationship import CaregiverSenior
from app.models.auth import User

app = create_app()
with app.app_context():
    # Find all seniors linked to caregiver 7 (the one likely logged in)
    caregiver_id = 7
    relations = CaregiverSenior.query.filter_by(caregiver_id=caregiver_id, status='accepted').all()
    
    for rel in relations:
        senior = User.query.get(rel.senior_id)
        print(f"\n--- Analytics for Senior {senior.id} ({senior.username}) ---")
        data = AnalyticsService.get_adherence_history(senior.id, 7)
        for d in data:
            print(f"{d['date']} ({d['full_date']}): Adh={d['adherence']}%, Exp={d['expected']}, Taken={d['taken']}, Missed={d['missed']}, Locked={d['isLocked']}")
    
    # Also check the caregiver's own adherence (just in case they are looking at self)
    me = User.query.get(caregiver_id)
    print(f"\n--- Analytics for CAREGIVER {me.id} ({me.username}) ---")
    data = AnalyticsService.get_adherence_history(me.id, 7)
    for d in data:
        print(f"{d['date']} ({d['full_date']}): Adh={d['adherence']}%, Exp={d['expected']}, Taken={d['taken']}, Missed={d['missed']}, Locked={d['isLocked']}")
