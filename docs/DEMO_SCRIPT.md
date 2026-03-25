# MedGuardian — Demo Script (8 minutes)

## Setup (before demo)
1. Run backend: `python run.py`
2. Run frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000
4. Have Betadine/Savlon bottle ready for camera demo

## Flow

### 1. Landing Page (30s)
- Show professional landing page
- Click "Demo Login"

### 2. Senior Dashboard (1 min)
- Login as rich_senior/demo123
- Show: greeting, today's doses, adherence 85%+, stat cards
- Point out: "Real data — 700+ medication logs over 90 days"

### 3. AI Verification (2 min) ← MOST IMPRESSIVE
- Go to /medications
- Click "Train AI" on any medication
- Hold bottle to camera — show YOLO detecting "Hand detected"
- Wait for 100% scan progress
- Show "Training complete" with fingerprint saved
- Click "Verify" — hold same bottle
- Show "Medication Verified ✅" result

### 4. Prescription Scanner (1 min)
- Go to /prescription-scanner
- Upload a real prescription photo
- Show BioBERT extracting medication names
- Add one to medications list

### 5. AI Chat (30s)
- Go to /chat
- Type: "What are the side effects of my Metformin?"
- Show response mentioning actual medications

### 6. Drug Interactions (30s)
- Go to /interactions
- Show D3 force graph with nodes
- Click a node — show interaction details

### 7. Explainability (30s)
- Go to /explainability
- Show SHAP feature importance bars
- Explain: "This tells caregivers WHY a patient was flagged"

### 8. Caregiver View (1.5 min)
- Logout → login as rich_caregiver/demo123
- Show: patient risk overview, anomaly alerts
- Show: real-time activity feed
- Show: contact patient flow

## Key phrases to use
- "All ML models run locally on GPU"
- "No patient data leaves the device for verification"
- "This is a trained custom LSTM, not a rule-based system"
- "BioBERT is the same architecture used in clinical NLP research"
