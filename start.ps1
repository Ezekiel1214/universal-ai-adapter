Write-Host "🤖 Universal AI Adapter Server" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server running at: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Open in browser or press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server
node server.js
