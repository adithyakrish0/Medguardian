# MedGuardian — Project Overview

## What is it?
AI-powered elderly medication management platform. BTech Final Year Project.

## Two user types:
- **Senior** (elderly patient): manages their own medications
- **Caregiver** (doctor/family): monitors linked seniors remotely

## Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS (dark theme)
- Backend: Flask, Python, SQLAlchemy, APScheduler, Socket.IO (Eventlet)
- Database: PostgreSQL via Supabase
- ML: PyTorch, scikit-learn, SHAP, PyTorch Geometric, Ultralytics YOLO

## Running the project
- Backend: `python run.py` (port 5000)
- Frontend: `cd frontend && npm run dev` (port 3000)
- Reset demo data: `$env:PYTHONPATH="."; python scripts/seed_rich_demo.py`
- Train LSTM: `$env:PYTHONPATH="."; python scripts/train_lstm.py`
- Train SHAP: `$env:PYTHONPATH="."; python scripts/train_shap.py`
- Train GNN: `$env:PYTHONPATH="."; python scripts/train_gnn.py`

## Demo accounts
- Senior: `rich_senior / demo123` (Margaret Wilson, 72)
- Caregiver: `rich_caregiver / demo123` (Dr. Sarah Mitchell)
- Alt Senior: `demo_senior / demo123`
- Alt Caregiver: `demo_caregiver / demo123`

## Environment
- OS: Windows, PowerShell
- GPU: RTX 3050 4GB VRAM (CUDA available)
- CPU: AMD Ryzen 5 5600H
- Python: 3.10.11
- Node: LTS

## Key env vars (.env)
- GEMINI_API_KEY — Google AI Studio
- DATABASE_URL — Supabase PostgreSQL
- SECRET_KEY — Flask session secret
- CHAT_BACKEND — "gemini" or "llama"
- VISION_DISABLED — "false" (YOLO enabled)
