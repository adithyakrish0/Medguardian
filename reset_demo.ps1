# MedGuardian - Reset Demo Data
Write-Host "Resetting demo data..." -ForegroundColor Cyan
$env:PYTHONPATH = "."
python scripts/seed_rich_demo.py
Write-Host "Demo data reset complete!" -ForegroundColor Green
Write-Host "Login: rich_senior / demo123" -ForegroundColor Yellow
