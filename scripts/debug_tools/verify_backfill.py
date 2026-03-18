from app import create_app
from app.services.analytics_service import AnalyticsService

app = create_app()
with app.app_context():
    data = AnalyticsService.get_adherence_history(8, 7)
    for d in data:
        print(f"{d['date']}: adh={d['adherence']}%, expected={d['expected']}, taken={d['taken']}, skipped={d['skipped']}")
