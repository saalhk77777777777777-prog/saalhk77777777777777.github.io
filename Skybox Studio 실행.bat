@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "PORT=4173"
set "URL=http://127.0.0.1:4173/index.html"

where python >nul 2>nul
if errorlevel 1 (
    echo Python not found.
    echo Please install Python and run this file again.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
    echo Starting local server...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process python -WorkingDirectory '%PROJECT_DIR%' -ArgumentList '-m','http.server','%PORT%' -WindowStyle Minimized"
    timeout /t 2 /nobreak >nul
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%URL%'"
exit /b 0
