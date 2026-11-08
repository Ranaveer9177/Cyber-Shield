@echo off
title Cyber-Shield Dev Server
echo Starting Cyber-Shield Development Environment...
echo.

:: Start Flask backend in new window
start "Cyber-Shield Backend" cmd /k "python app.py"

:: Wait a moment for Flask to start
timeout /t 3 >nul

:: Start React frontend in new window
start "Cyber-Shield Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Cyber-Shield Dev Environment Started!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause