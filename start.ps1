Write-Host "Universal AI Adapter" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Opening http://localhost:3000" -ForegroundColor Green
Start-Process "http://localhost:3000"
node server.js
