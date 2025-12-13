# app/services/gemini_service.py
"""
Gemini AI Service for MedGuardian
Uses Google's Gemini API for prescription OCR and insights
"""
import os
import base64
import requests
import json

class GeminiService:
    """Service for Gemini AI interactions"""
    
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        self.model = "gemini-1.5-flash"
    
    def is_configured(self):
        """Check if Gemini is configured"""
        return bool(self.api_key)
    
    def extract_prescription_data(self, image_base64):
        """
        Extract medication info from prescription image
        Returns: dict with medications list
        """
        if not self.is_configured():
            return {'success': False, 'error': 'Gemini API not configured'}
        
        try:
            url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
            
            prompt = """Analyze this prescription image and extract ALL medications.
For each medication found, provide:
- name: The medication name
- dosage: The dosage (e.g., "500mg", "10ml")
- frequency: How often to take (e.g., "twice daily", "morning and night")
- instructions: Any special instructions (e.g., "after food", "with water")

Return ONLY valid JSON in this exact format:
{
    "medications": [
        {
            "name": "Medication Name",
            "dosage": "dosage",
            "frequency": "frequency",
            "instructions": "instructions"
        }
    ],
    "notes": "any additional prescription notes"
}

If you cannot read the prescription clearly, still try your best to extract what you can see.
If completely unreadable, return: {"medications": [], "error": "Could not read prescription"}"""

            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 1024
                }
            }
            
            response = requests.post(url, json=payload, timeout=30)
            result = response.json()
            
            if 'candidates' in result and result['candidates']:
                text = result['candidates'][0]['content']['parts'][0]['text']
                
                # Clean up the response - remove markdown code blocks if present
                text = text.strip()
                if text.startswith('```json'):
                    text = text[7:]
                if text.startswith('```'):
                    text = text[3:]
                if text.endswith('```'):
                    text = text[:-3]
                text = text.strip()
                
                # Parse JSON
                data = json.loads(text)
                return {'success': True, 'data': data}
            else:
                return {'success': False, 'error': 'No response from Gemini'}
                
        except json.JSONDecodeError as e:
            return {'success': False, 'error': f'Failed to parse response: {str(e)}'}
        except requests.exceptions.Timeout:
            return {'success': False, 'error': 'Request timed out'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def generate_health_insights(self, compliance_data, medications):
        """
        Generate AI health insights from medication data
        """
        if not self.is_configured():
            return {'success': False, 'error': 'Gemini API not configured'}
        
        try:
            url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
            
            prompt = f"""Analyze this medication adherence data and provide personalized health insights.

COMPLIANCE DATA:
{json.dumps(compliance_data, indent=2)}

MEDICATIONS:
{json.dumps(medications, indent=2)}

Provide 3-5 actionable insights in JSON format:
{{
    "overall_score": "A/B/C/D grade",
    "summary": "One sentence summary",
    "insights": [
        {{
            "type": "positive/warning/suggestion",
            "icon": "emoji",
            "title": "Short title",
            "message": "Detailed insight message"
        }}
    ],
    "tips": ["tip1", "tip2", "tip3"]
}}

Focus on:
- Compliance patterns (morning vs evening)
- Consistency trends
- Practical suggestions for improvement
- Positive reinforcement for good adherence"""

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024
                }
            }
            
            response = requests.post(url, json=payload, timeout=30)
            result = response.json()
            
            if 'candidates' in result and result['candidates']:
                text = result['candidates'][0]['content']['parts'][0]['text']
                
                # Clean up response
                text = text.strip()
                if text.startswith('```json'):
                    text = text[7:]
                if text.startswith('```'):
                    text = text[3:]
                if text.endswith('```'):
                    text = text[:-3]
                text = text.strip()
                
                data = json.loads(text)
                return {'success': True, 'data': data}
            else:
                return {'success': False, 'error': 'No response from Gemini'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}


# Singleton instance
gemini_service = GeminiService()
