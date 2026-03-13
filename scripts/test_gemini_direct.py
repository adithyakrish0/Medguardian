import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(override=True)
api_key = os.environ.get('GEMINI_API_KEY')
print(f"Testing Gemini API with key: {api_key[:5]}...{api_key[-5:]}")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
payload = {
    "contents": [{"parts": [{"text": "Hello, are you there?"}]}]
}

try:
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
