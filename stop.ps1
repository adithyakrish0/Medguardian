# MedGuardian - Stop Everything
Write-Host "Stopping MedGuardian..." -ForegroundColor Cyan

# Kill port 5000 (Flask)
$port5000 = netstat -ano | findstr :5000 | findstr LISTENING
if ($port5000) {
    $pid5000 = ($port5000 -split '\s+')[-1]
    taskkill /PID $pid5000 /F 2>$null
    Write-Host "Backend stopped" -ForegroundColor Green
} else {
    Write-Host "Backend was not running" -ForegroundColor Gray
}

# Kill port 3000 (Next.js)
$port3000 = netstat -ano | findstr :3000 | findstr LISTENING
if ($port3000) {
    $pid3000 = ($port3000 -split '\s+')[-1]
    taskkill /PID $pid3000 /F 2>$null
    Write-Host "Frontend stopped" -ForegroundColor Green
} else {
    Write-Host "Frontend was not running" -ForegroundColor Gray
}

Write-Host "MedGuardian stopped." -ForegroundColor Cyan
