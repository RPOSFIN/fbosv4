@echo off
REM Manual one-shot Tally -> Google Sheet sync (WSIPL-89-72, port 9007)
setlocal
cd /d "%~dp0"

set "WEBAPP=%GOOGLE_WEBAPP_URL%"
if "%WEBAPP%"=="" (
  set "WEBAPP=https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec"
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0TallyToSheet.ps1" -TallyHost 127.0.0.1 -TallyPort 9007 -CompanyName "Flexiflair Tech Private Limited" -WebAppUrl "%WEBAPP%"
echo.
pause
