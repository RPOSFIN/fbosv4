@echo off
title FBOS Finance Setup - 2 steps only
echo.
echo ============================================
echo   FBOS FINANCE SETUP (2 steps)
echo ============================================
echo.
echo IMPORTANT: Supabase mein .BAT paste NAHI karna!
echo            Sirf RUN_FINANCE_SETUP.sql ka SQL copy karo.
echo.
echo STEP 1: Supabase SQL
echo   Notepad mein khulega: RUN_FINANCE_SETUP.sql
echo   Poora SQL copy ^> Supabase SQL Editor ^> Run
echo.
start "" "https://supabase.com/dashboard/project/eahojgogyrgoelqevbvq/sql/new"
timeout /t 2 >nul
notepad "%~dp0supabase\migrations\RUN_FINANCE_SETUP.sql"
echo.
echo STEP 2: Google Sheet Apps Script
echo   File opening: Code.gs + your sheet
echo   Run: initializeFinanceSheet
echo   Run: setupEvery2HourTriggers
echo   Deploy Web App
echo.
start "" "https://docs.google.com/spreadsheets/d/1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI/edit#gid=1663252170"
timeout /t 2 >nul
notepad "%~dp0scripts\google-apps-script\Code.gs"
echo.
echo Done. After both steps, run: npm run dev
echo Then open: http://127.0.0.1:3000/receivables
echo.
pause
