# MedGuardian API Documentation

## Base URL
```
http://localhost:5001/api/v1
```

## Authentication
All endpoints (except `/health`) require Flask-Login session authentication.

---

## Endpoints

### Health Check
**GET** `/health`

Check API status and available features.

**Response:**
```json
{
  "status": "healthy",
  "version": "v1",
  "features": {
    "yolo_loaded": true,
    "tesseract_available": true,
    "device": "cpu"
  }
}
```

---

### Get All Medications
**GET** `/medications`

Get all medications for the current user.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Aspirin",
      "dosage": "100mg",
      "frequency": "daily",
      "morning": true,
      "afternoon": false,
      "created_at": "2025-12-02T12:00:00",
      "updated_at": "2025-12-02T12:00:00"
    }
  ]
}
```

---

### Get Single Medication
**GET** `/medications/{id}`

Get medication by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Aspirin",
    "dosage": "100mg"
  }
}
```

---

### Create Medication
**POST** `/medications`

Create a new medication.

**Request Body:**
```json
{
  "name": "Aspirin",
  "dosage": "100mg",
  "frequency": "daily",
  "morning": true,
  "afternoon": false,
  "evening": false,
  "night": false,
  "reminder_enabled": true,
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Medication created successfully",
  "data": { ... }
}
```

---

### Update Medication
**PUT/PATCH** `/medications/{id}`

Update existing medication.

**Request Body:**
```json
{
  "dosage": "200mg",
  "priority": "high"
}
```

---

### Delete Medication
**DELETE** `/medications/{id}`

Delete medication.

**Response:**
```json
{
  "success": true,
  "message": "Medication deleted successfully"
}
```

---

### Mark Medication as Taken
**POST** `/medications/{id}/mark-taken`

Mark medication as taken.

**Request Body:**
```json
{
  "verified": true,
  "verification_method": "barcode",
  "notes": "Taken at breakfast"
}
```

---

### Get Medication Logs
**GET** `/medications/{id}/logs?limit=50`

Get medication history.

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)

---

### Verify Medication
**POST** `/verify`

Verify medication using image.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "medication_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "correct_medication": true,
  "method": "barcode",
  "confidence": 1.0,
  "message": "Barcode verified"
}
```

---

### Save Reference Image
**POST** `/medications/{id}/reference-image`

Save reference image for verification.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

---

### Get Current User
**GET** `/users/me`

Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testsenior",
    "email": "test@example.com",
    "role": "senior"
  }
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `404` - Not Found
- `500` - Server Error
