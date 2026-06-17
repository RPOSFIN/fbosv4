@echo off

cd /d "D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"

if not exist "package.json" (
  echo ERROR: package.json not found in:
  echo   D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1
  echo.
  echo Run npm run dev from that folder, not from D:\FBOSV01\FBOS_V01
  pause
  exit /b 1
)

echo ========================================

echo   FBOS - Flexiflair Business OS

echo ========================================

echo.

echo IMPORTANT: Keep this window OPEN while using FBOS.

echo If port 3000 is busy, close any old "npm run dev" terminal first.

echo.

echo Starting server on http://localhost:3000

echo Login page: http://localhost:3000/login

echo.

npm run dev -- -p 3000

echo.

echo Server stopped. Press any key to close...

pause >nul

