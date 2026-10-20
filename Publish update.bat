@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-manifest.ps1"
echo.
pause
