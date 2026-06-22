# Install-TallySync.ps1 — one-click Tally CLOUD sync for WSIPL-89-72
# Run as Administrator on the Tally cloud machine (same host as Tally port 9007).

param(
  [string]$InstallDir = "C:\FBOS\TallySync",
  [string]$WebAppUrl = $env:GOOGLE_WEBAPP_URL,
  [string]$TallyHost = "127.0.0.1",
  [int]$TallyPort = 9007,
  [string]$CompanyName = "Flexiflair Tech Private Limited",
  [string]$FbosWebhookUrl = $env:FBOS_TALLY_WEBHOOK_URL,
  [string]$SyncSecret = $env:SHEET_SYNC_SECRET,
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
Write-Host "FBOS hook   : $FbosWebhookUrl"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path $SourceScript -Destination (Join-Path $InstallDir "TallyToSheet.ps1") -Force

function Set-MachineEnvSafe([string]$Name, [string]$Value) {
  if (-not $Value) { return $false }
  try {
    [System.Environment]::SetEnvironmentVariable($Name, $Value, "Machine")
    Write-Host "Set machine env $Name" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "Machine env $Name not set: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Continuing: value will be passed directly to scheduled task arguments." -ForegroundColor Yellow
    return $false
  }
}

# Machine-level env for Task Scheduler (runs without user login)
Set-MachineEnvSafe "GOOGLE_WEBAPP_URL" $WebAppUrl | Out-Null
$env:GOOGLE_WEBAPP_URL = $WebAppUrl

if ($FbosWebhookUrl) {
  Set-MachineEnvSafe "FBOS_TALLY_WEBHOOK_URL" $FbosWebhookUrl | Out-Null
  $env:FBOS_TALLY_WEBHOOK_URL = $FbosWebhookUrl
}
if ($SyncSecret) {
  Set-MachineEnvSafe "SHEET_SYNC_SECRET" $SyncSecret | Out-Null
  $env:SHEET_SYNC_SECRET = $SyncSecret
}

$taskName = "FBOS_TallyToSheet_2h"
$scriptPath = Join-Path $InstallDir "TallyToSheet.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -TallyHost $TallyHost -TallyPort $TallyPort -CompanyName `"$CompanyName`" -WebAppUrl `"$WebAppUrl`""
if ($FbosWebhookUrl) { $arguments += " -FbosWebhookUrl `"$FbosWebhookUrl`"" }
if ($SyncSecret) { $arguments += " -SyncSecret `"$SyncSecret`"" }

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
  $testArgs = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath,
    "-TallyHost", $TallyHost,
    "-TallyPort", $TallyPort,
    "-CompanyName", $CompanyName,
    "-WebAppUrl", $WebAppUrl
  )
  if ($FbosWebhookUrl) { $testArgs += @("-FbosWebhookUrl", $FbosWebhookUrl) }
  if ($SyncSecret) { $testArgs += @("-SyncSecret", $SyncSecret) }
  & powershell.exe @testArgs
}

Write-Host ""
Write-Host "DONE. Verify:" -ForegroundColor Cyan
Write-Host "  1) Google Sheet tab 06_Finance_Sync has rows"
Write-Host "  2) 00_Sync_Status logs source=tally"
Write-Host "  3) Manual test: cd $InstallDir"
Write-Host "     powershell -ExecutionPolicy Bypass -File .\TallyToSheet.ps1"
