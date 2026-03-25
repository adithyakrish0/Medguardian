# MedGuardian — API Routes

Base URL: http://localhost:5000/api/v1

## Auth
- POST /auth/login
- POST /auth/register
- POST /auth/logout
- GET  /auth/me
- PUT  /auth/profile
- POST /auth/change-password

## Medications
- GET    /medications
- POST   /medications
- PUT    /medications/:id
- DELETE /medications/:id
- POST   /medications/:id/mark-taken
- POST   /medications/:id/skip
- POST   /medications/:id/feed (Train AI)
- GET    /medication-status

## Verification
- POST /verify (4-layer verification)
- POST /detect-hand (YOLO hand detection)

## Analytics
- GET /analytics/adherence
- GET /analytics/anomalies
- GET /explain/status
- GET /explain/global

## Chat
- POST /chat
- GET  /chat/history
- POST /chat/history/save
- GET  /chat/history/:session_id

## Caregiver
- GET  /caregiver/seniors
- GET  /caregiver/alerts
- GET  /caregiver/recent-logs
- POST /caregiver/send-reminder/:senior_id/:med_id
- POST /caregiver/request-camera/:senior_id

## Other
- POST /emergency/sos
- POST /anomalies/:patient_id/contact
- GET  /export/medications/pdf
- GET  /export/medications/csv
- POST /tts/synthesize
- POST /pk/simulate
- GET  /pk/medications
- POST /prescriptions/scan
