@echo off
echo ==========================================
echo  FBOS Tally Bridge - Port 9007
echo ==========================================
echo.
echo Ispe RIGHT-CLICK karke "Run with PowerShell" chunein
echo.
echo Ya automatically run karne ke liye Enter dabaen...
echo.
pause

powershell -ExecutionPolicy Bypass -File "%~dp0tally_bridge.ps1"

echo.
echo ==========================================
echo Done! Check 06_Finance_Sync tab in Google Sheet
echo ==========================================
pause
