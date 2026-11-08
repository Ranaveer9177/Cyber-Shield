# Cyber-Shield Development Launcher
# Runs Flask backend + React Vite frontend concurrently

Write-Host "Starting Cyber-Shield Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Start Flask backend
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\ranua\Videos\Cyber-Guard'; python app.py" -PassThru
Write-Host "Backend started (PID: $($backend.Id))" -ForegroundColor Green

# Wait for Flask to start
Start-Sleep -Seconds 3

# Start React frontend
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\ranua\Videos\Cyber-Guard\frontend'; npm run dev" -PassThru
Write-Host "Frontend started (PID: $($frontend.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "Cyber-Shield Dev Environment Started!" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in the backend/frontend windows to stop." -ForegroundColor Gray
Read-Host "Press Enter to exit launcher"