# MedGuardian — Complete Feature List

## Senior Features
1. Dashboard — greeting, today's doses, adherence %, SOS button
2. Medication Management — add/edit/delete, schedule (morning/afternoon/evening/night + custom)
3. AI Verification — YOLO hand detection → 4-layer Siamese verification
4. AI Training — Train AI on medication bottle via camera
5. Prescription Scanner — Gemini OCR + BioBERT NER → add medications
6. AI Chat — Gemini (primary) + Llama RAG (fallback), chat history sidebar
7. Drug Interactions — GNN graph, D3 visualization
8. Today's Schedule — timeline of all doses
9. Analytics — adherence charts, 30-90 day history
10. Emergency SOS — instant caregiver alert via Socket.IO
11. Export — PDF report + CSV via ReportLab
12. Settings — profile, password, notifications, audit logs

## Caregiver Features
13. Caregiver Dashboard — all seniors overview, risk scores, real-time feed
14. War Room — fleet telemetry, live activity stream
15. Anomaly Detection — Z-score + LSTM autoencoder alerts
16. SHAP Explainability — why a patient was flagged
17. Refill Predictions — when will medications run out
18. PK Simulations — pharmacokinetic concentration curves
19. Contact Patient — phone call or WhatsApp from alert
20. Anomaly Contact Flow — log follow-up, in-app notification to senior

## Platform Features
21. Real-time alerts via Socket.IO (missed doses, SOS, caregiver nudge)
22. Role-based access control (SeniorOnly/CaregiverOnly guards)
23. Telegram bot for reminders
24. Governance/audit logs
25. Automated scheduler (reminders, anomaly scan, refill check)
26. Chat history (auto-save, session management)
27. Prescription scanner with camera
28. Voice alerts (Kokoro TTS / Web Speech API fallback)

---

## MedGuardian — Verified File Map

### Frontend Pages (all confirmed exist)
| Feature | File |
|---------|------|
| Dashboard | `frontend/src/app/(dashboard)/dashboard/page.tsx` |
| Medications | `frontend/src/app/(dashboard)/medications/page.tsx` |
| Chat | `frontend/src/app/(dashboard)/chat/page.tsx` |
| Analytics | `frontend/src/app/(dashboard)/analytics/page.tsx` |
| Prescription Scanner | `frontend/src/app/(dashboard)/prescription-scanner/page.tsx` |
| Drug Interactions | `frontend/src/app/(dashboard)/interactions/page.tsx` |
| Explainability | `frontend/src/app/(dashboard)/explainability/page.tsx` |
| Anomalies | `frontend/src/app/(dashboard)/anomalies/page.tsx` |
| Refills | `frontend/src/app/(dashboard)/refills/page.tsx` |
| War Room | `frontend/src/app/(dashboard)/war-room/page.tsx` |
| PK Simulations | `frontend/src/app/(dashboard)/pk-simulations/page.tsx` |
| Caregiver | `frontend/src/app/(dashboard)/caregiver/page.tsx` |
| Schedule | `frontend/src/app/(dashboard)/schedule/page.tsx` |
| Export | `frontend/src/app/(dashboard)/export/page.tsx` |
| Settings | `frontend/src/app/(dashboard)/settings/page.tsx` |
| Governance | `frontend/src/app/(dashboard)/governance/page.tsx` |

### Key Components
| Component | File |
|-----------|------|
| AI Verification Modal | `frontend/src/components/AIVerificationModal.tsx` |
| AI Training Modal | `frontend/src/components/AIFeedModal.tsx` |
| Role Guard | `frontend/src/components/RoleGuard.tsx` |
| SOS Button | `frontend/src/components/SOSButton.tsx` |
| Error Boundary | `frontend/src/components/ErrorBoundary.tsx` |

### Core Libraries
| Library | File |
|---------|------|
| API Fetch (native fetch + AbortController 15s timeout) | `frontend/src/lib/api.ts` |
| Socket.IO client | `frontend/src/lib/socket.ts` |
