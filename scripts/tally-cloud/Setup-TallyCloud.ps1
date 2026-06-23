# Setup-TallyCloud.ps1 — WSIPL-89-72 full Tally connect (run as Administrator in TS Plus)
param(
  [string]$WebAppUrl = $env:GOOGLE_WEBAPP_URL,
  [string]$TallyHost = "127.0.0.1",
  [int]$TallyPort = 9007,
  [string]$CompanyName = "Flexiflair Tech Private Limited",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Continue"
$ReportPath = Join-Path $PSScriptRoot "FBOS-Tally-Setup-Report.json"
$report = @{
  timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  server = $env:COMPUTERNAME
  tallyHost = $TallyHost
  tallyPort = $TallyPort
  company = $CompanyName
  webAppUrl = $WebAppUrl
  steps = @()
}

function Add-Step([string]$Name, [bool]$Ok, [string]$Detail) {
  $script:report.steps += @{ step = $Name; ok = $Ok; detail = $Detail }
  $color = if ($Ok) { "Green" } else { "Red" }
  Write-Host ("[{0}] {1} — {2}" -f $(if ($Ok) { "PASS" } else { "FAIL" }), $Name, $Detail) -ForegroundColor $color
}

if (-not $WebAppUrl) {
  $WebAppUrl = "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec"
}

Write-Host "=== FBOS Tally Cloud Setup (WSIPL-89-72) ===" -ForegroundColor Cyan

# Step 1 — Tally gateway
$endpoint = "http://${TallyHost}:${TallyPort}"
$companyEsc = [System.Security.SecurityElement]::Escape($CompanyName)
$xml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>"
try {
  $gw = Invoke-WebRequest -Uri $endpoint -Method POST -Body $xml -ContentType "text/xml" -UseBasicParsing -TimeoutSec 30
  $preview = $gw.Content.Substring(0, [Math]::Min(120, $gw.Content.Length)) -replace "\s+", " "
  Add-Step "Tally gateway $endpoint" ($gw.StatusCode -eq 200) "HTTP $($gw.StatusCode) $preview"
} catch {
  Add-Step "Tally gateway $endpoint" $false $_.Exception.Message
  Write-Host "  Fix: Tally F12 -> Enable HTTP server -> Port 9007 -> Restart Tally" -ForegroundColor Yellow
}

# Step 2 — Webapp GET health
try {
  $health = Invoke-RestMethod -Uri $WebAppUrl -Method GET -TimeoutSec 30
  Add-Step "Webapp GET health" ($health.ok -eq $true) ($health | ConvertTo-Json -Compress)
} catch {
  Add-Step "Webapp GET health" $false $_.Exception.Message
}

# Step 3 — Install scheduler (optional)
if (-not $SkipInstall) {
  $installer = Join-Path $PSScriptRoot "Install-TallySync.ps1"
  if (Test-Path $installer) {
    try {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -WebAppUrl $WebAppUrl -TallyHost $TallyHost -TallyPort $TallyPort -CompanyName $CompanyName
      Add-Step "Install TallySync scheduler" $true "Task FBOS_TallyToSheet_2h registered"
    } catch {
      Add-Step "Install TallySync scheduler" $false $_.Exception.Message
    }
  } else {
    Add-Step "Install TallySync scheduler" $false "Install-TallySync.ps1 not found"
  }
}

# Step 4 — First sync
$syncScript = Join-Path $PSScriptRoot "TallyToSheet.ps1"
if (Test-Path $syncScript) {
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $syncScript -TallyHost $TallyHost -TallyPort $TallyPort -CompanyName $CompanyName -WebAppUrl $WebAppUrl
    Add-Step "TallyToSheet first sync" $true "Check 06_Finance_Sync tab"
  } catch {
    Add-Step "TallyToSheet first sync" $false $_.Exception.Message
  }
} else {
  Add-Step "TallyToSheet first sync" $false "TallyToSheet.ps1 not found"
}

$report.overallOk = -not ($report.steps | Where-Object { -not $_.ok })
$report | ConvertTo-Json -Depth 5 | Set-Content -Path $ReportPath -Encoding UTF8
Write-Host "`nReport saved: $ReportPath" -ForegroundColor Cyan
Write-Host "Share this JSON with FBOS support if any step FAIL." -ForegroundColor Cyan

if (-not $report.overallOk) { exit 1 }
