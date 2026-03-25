# MedGuardian — Quick Start

## One-Command Start
```powershell
.\start.ps1
```
This will:
1. Clear ports 3000 and 5000
2. Start Flask backend (port 5000)
3. Wait 15 seconds for backend to load ML models
4. Start Next.js frontend (port 3000)
5. Open browser automatically

## Stop Everything
```powershell
.\stop.ps1
```

## Reset Demo Data
```powershell
.\reset_demo.ps1
```

## Demo Accounts
| Role | Username | Password |
|------|----------|----------|
| Senior (Margaret Wilson, 72) | rich_senior | demo123 |
| Caregiver (Dr. Sarah Mitchell) | rich_caregiver | demo123 |

## Manual Start (if scripts don't work)
Terminal 1 — Backend:
```powershell
$env:PYTHONPATH="."; python run.py
```
Terminal 2 — Frontend:
```powershell
cd frontend; npm run dev
```
Then open http://localhost:3000
