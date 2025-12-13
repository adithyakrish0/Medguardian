# MedGuardian API Documentation

## Base URL

- Development: `http://localhost:5001`
- Production: `https://your-domain.com`

## Authentication

Most endpoints require authentication. Users must be logged in with a valid session cookie.

### Login
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=user123&password=secretpass
```

## Health Checks

### System Health
```http
GET /health

Response 200 OK:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00",
  "checks": {
    "database": "ok",
    "python_version": "3.10.0"
  }
}
```

### Ping
```http
GET /ping

Response 200 OK:
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00"
}
```

## Medications

### List Medications
```http
GET /medication/

Response: HTML page with medications list
```

### Add Medication
```http
POST /medication/add
Content-Type: multipart/form-data

Fields:
- name: string (required)
- dosage: string (required)
- morning: boolean
- afternoon: boolean
- evening: boolean
- night: boolean
- custom_reminder_times: JSON array of times
- instructions: string
- priority: string (high/medium/low)
- start_date: date
- end_date: date
- reference_image: file (optional)
```

### Check Due Reminders (API)
```http
GET /medication/api/check-due-reminders

Response 200 OK (medication due):
{
  "due": true,
  "medication_id": 123,
  "medication_name": "Aspirin",
  "dosage": "100mg",
  "scheduled_time": "2024-01-01T08:00:00",
  "scheduled_time_display": "08:00 AM",
  "instructions": "Take with food",
  "priority": "high",
  "redirect_url": "/medication/medication-reminder/123?time=..."
}

Response 200 OK (no medications due):
{
  "due": false
}
```

### Mark as Taken
```http
POST /medication/mark-taken/<medication_id>
Content-Type: application/json

{
  "verified_by_camera": true,
  "verification_method": "ai_training",
  "confidence_score": 0.95
}

Response 200 OK:
{
  "success": true,
  "message": "Medication marked as taken"
}
```

### Skip Dose
```http
POST /medication/skip-dose/<medication_id>

Response 200 OK:
{
  "success": true,
  "message": "Dose marked as skipped"
}
```

## Snooze

### Create Snooze
```http
POST /snooze/create-snooze
Content-Type: application/json

{
  "medication_id": 123,
  "duration": 5,
  "original_time": "2024-01-01T08:00:00"
}

Response 200 OK:
{
  "success": true,
  "snooze_id": 456,
  "snooze_until": "2024-01-01T08:05:00",
  "message": "Snoozed for 5 minutes"
}
```

### Get Active Snooze
```http
GET /snooze/get-active-snooze

Response 200 OK (active snooze exists):
{
  "success": true,
  "snooze_id": 456,
  "snooze_until": "2024-01-01T08:05:00",
  "duration_minutes": 5,
  "original_time": "2024-01-01T08:00:00",
  "medication_name": "Aspirin"
}

Response 200 OK (no active snooze):
{
  "success": false,
  "message": "No active snooze found"
}
```

## Emergency SOS

### Trigger SOS
```http
POST /emergency/api/trigger
Content-Type: application/json

{
  "location": "Home",
  "notes": "Chest pain"
}

Response 200 OK:
{
  "success": true,
  "message": "Emergency alert sent to all contacts"
}
```

## Analytics

### Export Data
```http
GET /export/csv?start_date=2024-01-01&end_date=2024-01-31

Response: CSV file download
```

```http
GET /export/pdf?start_date=2024-01-01&end_date=2024-01-31

Response: PDF file download
```

## Insights

### Get Health Insights
```http
GET /insights/api/generate

Response 200 OK:
{
  "success": true,
  "insights": [
    {
      "type": "compliance",
      "message": "Great job! 95% compliance this week",
      "severity": "positive"
    },
    {
      "type": "interaction",
      "message": "Potential interaction between Aspirin and Ibuprofen",
      "severity": "warning"
    }
  ]
}
```

## Telegram

### Link Account
```http
POST /telegram/link
Content-Type: application/json

{
  "chat_id": 123456789,
  "username": "user123"
}

Response 200 OK:
{
  "success": true,
  "message": "Telegram account linked successfully"
}
```

## Voice Commands (Frontend)

Voice commands are processed client-side. The JavaScript API:

```javascript
// Start listening
window.voiceCommandSystem.startListening();

// Stop listening
window.voiceCommandSystem.stopListening();

// Supported commands
- "go to dashboard"
- "show my medications"
- "what's next"
- "mark medication taken"
- "snooze reminder"
- "emergency"
```

## WebSocket Events (SocketIO)

### Connect to Socket
```javascript
const socket = io();

// Join user room
socket.emit('join', { room: 'user_123' });

// Listen for medication reminders
socket.on('medication_reminder', (data) => {
  console.log('Reminder:', data);
  // data = {
  //   medication_id: 123,
  //   medication_name: "Aspirin",
  //   dosage: "100mg",
  //   scheduled_time: "2024-01-01T08:00:00",
  //   scheduled_time_display: "08:00 AM",
  //   instructions: "Take with food",
  //   priority: "high"
  // }
});
```

## Error Responses

All endpoints follow standard HTTP status codes:

### 400 Bad Request
```json
{
  "error": "Invalid medication ID"
}
```

### 401 Unauthorized
```json
{
  "error": "Please log in to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to modify this medication"
}
```

### 404 Not Found
```json
{
  "error": "Medication not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred"
}
```

## Rate Limiting

- Default: 400 requests per hour, 2000 per day
- Health check endpoints: No rate limit
- Authentication endpoints: Stricter limits (50 per hour)

## CSRF Protection

All state-changing requests (POST, PUT, DELETE) require a valid CSRF token:

```javascript
// Get CSRF token from meta tag
const csrf_token = document.querySelector('meta[name="csrf-token"]').content;

// Include in requests
fetch('/medication/add', {
  method: 'POST',
  headers: {
    'X-CSRFToken': csrf_token
  }
});
```

## Pagination

List endpoints support pagination:

```http
GET /medication/history?page=1&per_page=20
```

## Filtering

Analytics endpoints support date filtering:

```http
GET /analytics/?start_date=2024-01-01&end_date=2024-01-31
```

## Response Times

Expected response times:
- Health check: < 50ms
-  Simple GET: < 200ms
- POST with database write: < 500ms
- AI Vision processing: 1-3 seconds
- PDF export: 2-5 seconds

## Versioning

Current API version: v1

For versioned endpoints, use `/api/v1/` prefix when implemented in the future.
