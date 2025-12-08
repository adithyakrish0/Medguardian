# 🔌 MedGuardian API Documentation

**Base URL**: `http://localhost:5001/api/v1`
**Version**: 1.0
**Authentication**: Required for all endpoints (except registration/login)

---

## 🔐 Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "senior"  # or "caregiver"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "senior"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "senior"
  }
}
```

### Logout
```http
GET /auth/logout
```

---

## 💊 Medications

### Get All Medications
```http
GET /api/v1/medications
Authorization: Required (logged in)
```

**Response (200)**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Aspirin",
      "dosage": "100mg",
      "frequency": "Daily",
      "morning": true,
      "afternoon": false,
      "evening": false,
      "night": true,
      "custom_reminder_times": null,
      "instructions": "Take with food",
      "priority": "normal",
      "start_date": "2025-01-01",
      "end_date": null,
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

**For complete API documentation, see the full file.**

**Last Updated**: December 6, 2025
