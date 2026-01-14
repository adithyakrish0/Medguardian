@echo off
title MedGuardian Demo Server
color 0A

echo =========================================
echo     MedGuardian Demo Server Launcher
echo =========================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python first.
    pause
    exit /b 1
)

:: Check if cloudflared is available
cloudflared --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] cloudflared not found!
    echo.
    echo Install it with:
    echo   winget install Cloudflare.cloudflared
    echo.
    echo Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
    pause
    exit /b 1
)

echo [OK] Python found
echo [OK] Cloudflared found
echo.

:: Start Flask server in background
echo [1/2] Starting Flask server...
start "MedGuardian Server" cmd /c "python run.py"

:: Wait for server to start
echo      Waiting for server to start...
timeout /t 5 /nobreak >nul

:: Start cloudflared tunnel
echo [2/2] Starting Cloudflare tunnel...
echo.
echo =========================================
echo   SHARE THIS URL WITH YOUR FRIEND:
echo =========================================
echo.

cloudflared tunnel --url http://localhost:5000

pause
