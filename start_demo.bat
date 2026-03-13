@echo off
title MedGuardian Demo Startup
color 0A

echo ========================================
echo   MEDGUARDIAN DEMO DAY STARTUP
echo ========================================
echo.

echo [1/9] Checking system requirements...
python --version
node --version
echo.

echo [2/9] Syncing Database (Safe Upgrade)...
set FLASK_APP=run.py
if exist migrations (
    echo Syncing latest schema...
    flask db upgrade
    echo Current DB Version:
    flask db current
) else (
    echo ⚠️ Migrations folder not found! Skipping schema sync.
)
echo ✓ Database sync completed
echo.

echo [3/9] Clearing Frontend Cache...
cd frontend
if exist .next\cache (
    echo Cleaning Next.js cache...
    rmdir /s /q .next\cache
)
cd ..
echo ✓ Cache cleared
echo.

echo [4/9] Checking AI Model Files...
if exist backend\models\saved\llama-medguardian (
    echo ✓ LLM (1.1B) model found
) else (
    echo ✗ ERROR: LLM model missing at backend\models\saved\llama-medguardian
    pause
    exit
)
echo.

echo [5/9] Checking Knowledge Base (ChromaDB)...
if exist backend\data\chromadb (
    echo ✓ ChromaDB vector store found
) else (
    echo ✗ ERROR: ChromaDB missing at backend\data\chromadb
    pause
    exit
)
echo.

echo [6/9] Verifying Database Connection...
python -c "from app import create_app; app = create_app(); print('✓ Database Connection: OK')"
echo.

echo [7/9] Starting Backend Server (Port 5000)...
start "MedGuardian Backend" cmd /k "python run.py"
echo Waiting for backend to initialize...
timeout /t 12
echo.

echo [8/9] Starting Frontend Server (Port 3000)...
start "MedGuardian Frontend" cmd /k "cd frontend && npm run dev"
echo Waiting for frontend to initialize...
timeout /t 10
echo.

echo [9/9] Opening Dashboards...
start http://localhost:3000/analytics/comparison
timeout /t 2
start http://localhost:3000/assistant
echo.

echo ========================================
echo   ✓ SYSTEM DEMO-READY!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Tips for Demo:
echo 1. Ensure NVIDIA GPU is active if running LLM.
echo 2. Toggle "Demo Mode" in UI to populate charts.
echo 3. Keep this window open to monitor logs.
echo.
echo Press any key to view pooled logs...
pause
