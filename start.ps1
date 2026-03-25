# MedGuardian - Start Everything
Write-Host "Starting MedGuardian..." -ForegroundColor Cyan

# Check if ports are already in use and kill them
Write-Host "Clearing ports..." -ForegroundColor Yellow
$port5000 = netstat -ano | findstr :5000 | findstr LISTENING
if ($port5000) {
    $pid5000 = ($port5000 -split '\s+')[-1]
    taskkill /PID $pid5000 /F 2>$null
    Write-Host "Cleared port 5000" -ForegroundColor Green
}
$port3000 = netstat -ano | findstr :3000 | findstr LISTENING
if ($port3000) {
    $pid3000 = ($port3000 -split '\s+')[-1]
    taskkill /PID $pid3000 /F 2>$null
    Write-Host "Cleared port 3000" -ForegroundColor Green
}

# Start Backend
Write-Host "Starting Flask backend on port 5000..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:PYTHONPATH='.'; python run.py" -PassThru
Write-Host "Backend started (PID: $($backend.Id))" -ForegroundColor Green

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize (15s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Start Frontend
Write-Host "Starting Next.js frontend on port 3000..." -ForegroundColor Yellow
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -PassThru
Write-Host "Frontend started (PID: $($frontend.Id))" -ForegroundColor Green

# Wait for frontend
Write-Host "Waiting for frontend to initialize (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Open browser
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "MedGuardian is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo accounts:" -ForegroundColor Yellow
Write-Host "  Senior:    rich_senior / demo123" -ForegroundColor White
Write-Host "  Caregiver: rich_caregiver / demo123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each terminal window to stop." -ForegroundColor Gray
