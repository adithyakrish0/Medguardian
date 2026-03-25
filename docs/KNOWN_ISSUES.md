# MedGuardian — Known Issues & Limitations

## Active limitations
1. Llama RAG not tested end-to-end (CHAT_BACKEND=gemini used)
2. Prescription scanner requires good lighting for accurate OCR
3. AI verification requires training before first use per medication
4. YOLO hand detection threshold may need adjustment for different skin tones/lighting
5. Kokoro TTS requires ~350MB download on first use

## Acceptable for demo
- Voice alerts fall back to Web Speech API if Kokoro unavailable
- Anomaly contact flow requires caregiver login to test
- Telegram bot requires active polling (started with backend)

## Not implemented (future work)
- Fine-tuning Llama on medical data (using RAG instead)
- Mobile app
- Multi-language support
- HIPAA compliance certification
