# FBOS V4 - P0 AUTO-FIX SCRIPT
# Jobs + ClickUp Tasks Population
# Run once, everything happens automatically

$ErrorActionPreference = "Continue"
$projectRoot = "D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FBOS V4 P0 AUTO-FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to project
Set-Location $projectRoot
Write-Host "`n[1/8] Navigated to: $projectRoot" -ForegroundColor Green

# ==================== STEP 1: BEFORE COUNTS ====================
Write-Host "`n[2/8] Getting BEFORE counts..." -ForegroundColor Yellow

$sqlBefore = @"
SELECT 'jobs' as table_name, COUNT(*) as count FROM jobs
UNION ALL
SELECT 'clickup_tasks', COUNT(*) FROM clickup_tasks;
"@

Write-Host "BEFORE counts (run manually in Supabase SQL Editor):" -ForegroundColor Cyan
Write-Host $sqlBefore
Write-Host "`nPress Enter after you've noted the BEFORE counts..." -ForegroundColor Yellow
Read-Host

# ==================== STEP 2: GIT CHECKPOINT ====================
Write-Host "`n[3/8] Creating git checkpoint..." -ForegroundColor Yellow

try {
    git add . 2>&1 | Out-Null
    $commitMsg = "Pre-P0-fix checkpoint (auto script) - $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    git commit -m $commitMsg 2>&1 | Out-Null
    $commitHash = git rev-parse --short HEAD
    git push origin main 2>&1 | Out-Null
    Write-Host "✅ Git checkpoint created: $commitHash" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git checkpoint warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ==================== STEP 3: ZIP BACKUP ====================
Write-Host "`n[4/8] Creating ZIP backup..." -ForegroundColor Yellow

try {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = Join-Path (Split-Path $projectRoot -Parent) "FBOS_V01_backup_$timestamp.zip"
    Compress-Archive -Path $projectRoot -DestinationPath $backupPath -Force
    Write-Host "✅ ZIP backup created: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️ ZIP backup warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ==================== STEP 4: FIX JOBS (ENV VAR) ====================
Write-Host "`n[5/8] Fixing Jobs (env var alignment)..." -ForegroundColor Yellow

$envFile = Join-Path $projectRoot ".env.local"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Check if GOOGLE_SHEET_GID_ORDERS exists
    if ($envContent -match "GOOGLE_SHEET_GID_ORDERS=") {
        # Extract the value
        $ordersGid = [regex]::Match($envContent, "GOOGLE_SHEET_GID_ORDERS=(\d+)").Groups[1].Value
        
        # Add alias if not exists
        if ($envContent -notmatch "GOOGLE_SHEET_GID_OPERATIONS=") {
            $newLine = "`nGOOGLE_SHEET_GID_OPERATIONS=$ordersGid  # Auto-added alias for Jobs"
            Add-Content -Path $envFile -Value $newLine
            Write-Host "✅ Added GOOGLE_SHEET_GID_OPERATIONS=$ordersGid" -ForegroundColor Green
        } else {
            Write-Host "✅ GOOGLE_SHEET_GID_OPERATIONS already exists" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ GOOGLE_SHEET_GID_ORDERS not found in .env.local" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ .env.local not found" -ForegroundColor Yellow
}

# ==================== STEP 5: RESTART DEV SERVER ====================
Write-Host "`n[6/8] Restarting dev server..." -ForegroundColor Yellow
Write-Host "⚠️ Please manually restart: Stop current server (Ctrl+C) and run 'npm run dev'" -ForegroundColor Yellow
Write-Host "Press Enter after restart..." -ForegroundColor Yellow
Read-Host

# ==================== STEP 6: TRIGGER IMPORTS ====================
Write-Host "`n[7/8] Triggering imports..." -ForegroundColor Yellow
Write-Host "⚠️ Please manually trigger:" -ForegroundColor Yellow
Write-Host "  1. Navigate to Orders/Operations import page in browser" -ForegroundColor Yellow
Write-Host "  2. Click sync/import button" -ForegroundColor Yellow
Write-Host "  3. OR call: GET http://localhost:3000/api/import/orders" -ForegroundColor Yellow
Write-Host "  4. For ClickUp: POST http://localhost:3000/api/integrations/clickup/sync" -ForegroundColor Yellow
Write-Host "`nPress Enter after imports complete..." -ForegroundColor Yellow
Read-Host

# ==================== STEP 7: AFTER COUNTS ====================
Write-Host "`n[8/8] Getting AFTER counts..." -ForegroundColor Yellow

$sqlAfter = @"
SELECT 'jobs' as table_name, COUNT(*) as count FROM jobs
UNION ALL
SELECT 'clickup_tasks', COUNT(*) FROM clickup_tasks;
"@

Write-Host "AFTER counts (run in Supabase SQL Editor):" -ForegroundColor Cyan
Write-Host $sqlAfter
Write-Host "`nExpected: Both counts > 0" -ForegroundColor Green

# ==================== SUMMARY ====================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AUTO-FIX COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Git checkpoint: $commitHash" -ForegroundColor Green
Write-Host "✅ ZIP backup: $backupPath" -ForegroundColor Green
Write-Host "✅ Env var alias added" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run AFTER counts SQL query" -ForegroundColor Yellow
Write-Host "2. Verify both counts > 0" -ForegroundColor Yellow
Write-Host "3. Check Jobs page in browser" -ForegroundColor Yellow
Write-Host "4. Check ClickUp tasks page in browser" -ForegroundColor Yellow
Write-Host "5. Share results with me" -ForegroundColor Yellow