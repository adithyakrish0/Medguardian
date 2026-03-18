from app import create_app
from app.services.analytics_service import AnalyticsService
app = create_app()
with app.app_context():
    data = AnalyticsService.get_adherence_history(8, 30)
    for d in data:
        print(f"{d['full_date']}: Adh={d['adherence']}, Locked={d['isLocked']}, Est={d['isEstablishment']}")
