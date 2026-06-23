@echo off
REM Full Tally cloud setup — WSIPL-89-72 (Admin, TS Plus session)
setlocal
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
  echo Requesting Administrator privileges...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "WEBAPP=%GOOGLE_WEBAPP_URL%"
if "%WEBAPP%"=="" (
  set "WEBAPP=https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec"
)

echo === FBOS Tally Cloud Setup ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-TallyCloud.ps1" -WebAppUrl "%WEBAPP%"
echo.
pause
