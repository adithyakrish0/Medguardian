from app.services.gemini_service import gemini_service
import os
from dotenv import load_dotenv

load_dotenv()

print(f"API Key present: {bool(os.environ.get('GEMINI_API_KEY'))}")

context = {
    'user_name': 'Test User',
    'medications': [{'name': 'Test Med', 'dosage': '10mg', 'frequency': 'Daily', 'times': '08:00'}],
    'compliance_rate': 95
}

response = gemini_service.chat_with_guardian("Hello", [], context)
print("\nResponse:")
print(response)
