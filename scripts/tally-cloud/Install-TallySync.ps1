# Install-TallySync.ps1 — one-click Tally CLOUD sync for WSIPL-89-72
# Run as Administrator on the Tally cloud machine (same host as Tally port 9007).

param(
  [string]$InstallDir = "C:\FBOS\TallySync",
  [string]$WebAppUrl = $env:GOOGLE_WEBAPP_URL,
  [string]$TallyHost = "127.0.0.1",
  [int]$TallyPort = 9007,
  [string]$CompanyName = "Flexiflair Tech Private Limited",
  [switch]$SkipScheduler,
  [switch]$TestRun
)

$ErrorActionPreference = "Stop"
$SourceScript = Join-Path $PSScriptRoot "TallyToSheet.ps1"

if (-not (Test-Path $SourceScript)) {
  Write-Error "TallyToSheet.ps1 not found next to installer: $SourceScript"
  exit 1
}

if (-not $WebAppUrl) {
  $WebAppUrl = Read-Host "GOOGLE_WEBAPP_URL (Apps Script web app exec URL)"
}
if (-not $WebAppUrl) {
  Write-Error "GOOGLE_WEBAPP_URL required"
  exit 1
}

Write-Host "=== FBOS Tally Sync Installer (WSIPL-89-72) ===" -ForegroundColor Cyan
Write-Host "Install dir : $InstallDir"
Write-Host "Tally       : http://${TallyHost}:${TallyPort}"
Write-Host "Company     : $CompanyName"
Write-Host "Web app     : $WebAppUrl"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path $SourceScript -Destination (Join-Path $InstallDir "TallyToSheet.ps1") -Force

# Machine-level env for Task Scheduler (runs without user login)
[System.Environment]::SetEnvironmentVariable("GOOGLE_WEBAPP_URL", $WebAppUrl, "Machine")
$env:GOOGLE_WEBAPP_URL = $WebAppUrl
Write-Host "Set machine env GOOGLE_WEBAPP_URL" -ForegroundColor Green

$fbosWebhook = $env:FBOS_TALLY_WEBHOOK_URL
if ($fbosWebhook) {
  [System.Environment]::SetEnvironmentVariable("FBOS_TALLY_WEBHOOK_URL", $fbosWebhook, "Machine")
  Write-Host "Set machine env FBOS_TALLY_WEBHOOK_URL" -ForegroundColor Green
}
$syncSecret = $env:SHEET_SYNC_SECRET
if ($syncSecret) {
  [System.Environment]::SetEnvironmentVariable("SHEET_SYNC_SECRET", $syncSecret, "Machine")
  Write-Host "Set machine env SHEET_SYNC_SECRET" -ForegroundColor Green
}

$taskName = "FBOS_TallyToSheet_2h"
$scriptPath = Join-Path $InstallDir "TallyToSheet.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -TallyHost $TallyHost -TallyPort $TallyPort -CompanyName `"$CompanyName`""

if (-not $SkipScheduler) {
  $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed old scheduled task $taskName"
  }

  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $InstallDir
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours(1) -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration ([TimeSpan]::MaxValue)
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "FBOS: Tally -> 06_Finance_Sync every 2 hours" | Out-Null
  Write-Host "Scheduled task registered: $taskName (every 2h)" -ForegroundColor Green
}

if ($TestRun) {
  Write-Host "Running test sync..." -ForegroundColor Yellow
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -TallyHost $TallyHost -TallyPort $TallyPort -CompanyName $CompanyName
}

Write-Host ""
Write-Host "DONE. Verify:" -ForegroundColor Cyan
Write-Host "  1) Google Sheet tab 06_Finance_Sync has rows"
Write-Host "  2) 00_Sync_Status logs source=tally"
Write-Host "  3) Manual test: cd $InstallDir"
Write-Host "     powershell -ExecutionPolicy Bypass -File .\TallyToSheet.ps1"
