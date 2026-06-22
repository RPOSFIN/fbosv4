# TallyToSheet.ps1 — WSIPL-89-72 | ONE sheet tab 06_Finance_Sync
# Sab Tally data ek batch mein → Google Sheet → Supabase

param(
  [string]$TallyHost = "127.0.0.1",
  [int]$TallyPort = 9007,
  [string]$CompanyName = "Flexiflair Tech Private Limited",
  [string]$WebAppUrl = $env:GOOGLE_WEBAPP_URL,
  [string]$FbosWebhookUrl = $env:FBOS_TALLY_WEBHOOK_URL,
  [string]$SyncSecret = $env:SHEET_SYNC_SECRET,
  [string]$FromDate = "20260401",
  [string]$ToDate = "20270331",
  [int]$TallyTimeoutSec = 60,
  [int]$DayBookChunkDays = 7,
  [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"
if (-not $WebAppUrl) { Write-Error "GOOGLE_WEBAPP_URL set karo"; exit 1 }
if (-not $LogPath) { $LogPath = Join-Path $PSScriptRoot "TallyToSheet.log" }

$endpoint = "http://${TallyHost}:${TallyPort}"
$companyEsc = [System.Security.SecurityElement]::Escape($CompanyName)
$syncedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$all = [System.Collections.Generic.List[object]]::new()
$ledgerParents = @{}

function Write-Log([string]$Message, [string]$Level = "INFO") {
  $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
  Write-Host $line
  try { Add-Content -Path $LogPath -Value $line -Encoding UTF8 } catch { }
}

function Get-Preview([string]$Text, [int]$Max = 500) {
  if (-not $Text) { return "" }
  $clean = $Text -replace "\s+", " "
  if ($clean.Length -le $Max) { return $clean }
  return $clean.Substring(0, $Max)
}

function Invoke-TallyXml([string]$Name, [string]$Body, [int]$TimeoutSec = $TallyTimeoutSec) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Write-Log "Tally request START name=$Name endpoint=$endpoint timeout=${TimeoutSec}s bytes=$($Body.Length)"
  try {
    $resp = Invoke-WebRequest -Uri $endpoint -Method POST -Body $Body -ContentType "text/xml" -TimeoutSec $TimeoutSec -UseBasicParsing
    $sw.Stop()
    $content = [string]$resp.Content
    Write-Log "Tally request OK name=$Name status=$($resp.StatusCode) ms=$($sw.ElapsedMilliseconds) bytes=$($content.Length) preview=$(Get-Preview $content 300)"
    return $content
  } catch {
    $sw.Stop()
    Write-Log "Tally request FAIL name=$Name ms=$($sw.ElapsedMilliseconds) error=$($_.Exception.Message)" "ERROR"
    Write-Warning $_
    return $null
  }
}

function Convert-TallyAmount([string]$Value) {
  if (-not $Value) { return 0 }
  $clean = ($Value -replace ',', '' -replace 'Dr', '' -replace 'Cr', '').Trim()
  try { return [Math]::Abs([decimal]$clean) } catch {
    Write-Log "Amount parse failed value=$Value clean=$clean" "WARN"
    return 0
  }
}

function New-TallyExportXml([string]$ReportName, [string]$StaticVariables = "") {
  return "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>$ReportName</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>`$`$SysName:XML</SVEXPORTFORMAT>$StaticVariables</STATICVARIABLES></DESC></BODY></ENVELOPE>"
}

function Convert-YmdToDate([string]$Value) {
  return [datetime]::ParseExact($Value, "yyyyMMdd", [System.Globalization.CultureInfo]::InvariantCulture)
}

function Format-TallyDate([string]$d) {
  if ($d -and $d.Length -eq 8) { return "$($d.Substring(0,4))-$($d.Substring(4,2))-$($d.Substring(6,2))" }
  return $d
}

function Get-OverdueDays([string]$dueDate) {
  if (-not $dueDate) { return 0 }
  try {
    $due = [datetime]::Parse($dueDate)
    $days = ([datetime]::Today - $due).Days
    if ($days -lt 0) { return 0 }
    return $days
  } catch { return 0 }
}

function Add-Row([hashtable]$Row) {
  if (-not $Row.data_type) { $Row.data_type = "ledger" }
  $Row.company_name = $CompanyName
  $Row.synced_at = $syncedAt
  $all.Add([pscustomobject]$Row)
}

# Ledgers + bank/cash filter (also builds parent map for vouchers)
Write-Log "FBOS Tally sync START endpoint=$endpoint company=$CompanyName from=$FromDate to=$ToDate chunkDays=$DayBookChunkDays timeout=${TallyTimeoutSec}s webapp=$WebAppUrl webhook=$FbosWebhookUrl"
$companyStatic = "<SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY>"
$lXml = New-TallyExportXml "List of Accounts" $companyStatic
$lRes = Invoke-TallyXml "List of Ledgers" $lXml
if ($lRes) {
  [regex]::Matches($lRes, '<LEDGER[\s\S]*?</LEDGER>') | ForEach-Object {
    $b = $_.Value
    $name = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    if (-not $name) { return }
    $parent = if ($b -match '<PARENT>([^<]+)</PARENT>') { $Matches[1] } else { "" }
    $ledgerParents[$name] = $parent
    $open = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $open = Convert-TallyAmount $Matches[1] }
    $close = 0; if ($b -match '<CLOSINGBALANCE>([^<]+)</CLOSINGBALANCE>') { $close = Convert-TallyAmount $Matches[1] }
    $gst = if ($b -match '<PARTYGSTIN>([^<]+)</PARTYGSTIN>') { $Matches[1] } else { "" }

    if ($parent -match 'Bank|Cash') {
      Add-Row @{
        data_type = "bank_cash"
        ledger_name = $name
        parent_group = $parent
        bank_name = $name
        opening_balance = $open
        balance = $close
        as_on_date = (Get-Date -Format "yyyy-MM-dd")
        description = "Bank/Cash balance"
        amount = $close
      }
    } else {
      Add-Row @{
        data_type = "ledger"
        ledger_name = $name
        parent_group = $parent
        opening_balance = $open
        closing_balance = $close
        amount = $close
        gst_no = $gst
        description = "Ledger"
      }
    }
  }
}

# Vouchers — chunked Daybook export avoids full-FY Tally timeout
$fromDt = Convert-YmdToDate $FromDate
$toDt = Convert-YmdToDate $ToDate
$cursor = $fromDt
while ($cursor -le $toDt) {
  $chunkTo = $cursor.AddDays($DayBookChunkDays - 1)
  if ($chunkTo -gt $toDt) { $chunkTo = $toDt }
  $chunkFromText = $cursor.ToString("yyyyMMdd")
  $chunkToText = $chunkTo.ToString("yyyyMMdd")
  $daybookStatic = "$companyStatic<SVFROMDATE>$chunkFromText</SVFROMDATE><SVTODATE>$chunkToText</SVTODATE>"
  $vXml = New-TallyExportXml "Daybook" $daybookStatic
  $vRes = Invoke-TallyXml "Daybook $chunkFromText-$chunkToText" $vXml
  if ($vRes) {
    [regex]::Matches($vRes, '<VOUCHER[\s\S]*?</VOUCHER>') | ForEach-Object {
      $b = $_.Value
      $vDate = Format-TallyDate $(if ($b -match '<DATE>(\d+)</DATE>') { $Matches[1] } else { "" })
      $vNo = $(if ($b -match '<VOUCHERNUMBER>([^<]+)</VOUCHERNUMBER>') { $Matches[1] } else { "" })
      $vType = $(if ($b -match '<VOUCHERTYPENAME>([^<]+)</VOUCHERTYPENAME>') { $Matches[1] } else { "Voucher" })
      $party = $(if ($b -match '<PARTYLEDGERNAME>([^<]+)</PARTYLEDGERNAME>') { $Matches[1] } else { "" })
      $narr = $(if ($b -match '<NARRATION>([^<]+)</NARRATION>') { $Matches[1] } else { "" })

      [regex]::Matches($b, '<ALLLEDGERENTRIES\.LIST>[\s\S]*?</ALLLEDGERENTRIES\.LIST>') | ForEach-Object {
        $le = $_.Value
        $led = if ($le -match '<LEDGERNAME>([^<]+)</LEDGERNAME>') { $Matches[1] } else { "" }
        if (-not $led) { return }
        $amt = 0; if ($le -match '<AMOUNT>([^<]+)</AMOUNT>') { $amt = Convert-TallyAmount $Matches[1] }
        if ($amt -eq 0) { return }
        $isCr = $le -match '<AMOUNT>-'
        $parent = if ($ledgerParents.ContainsKey($led)) { $ledgerParents[$led] } else { "" }
        Add-Row @{
          data_type = "voucher"
          voucher_date = $vDate
          voucher_no = $vNo
          voucher_type = $vType
          party_name = $party
          ledger_name = $led
          parent_group = $parent
          description = "Voucher entry"
          debit = $(if ($isCr) { 0 } else { $amt })
          credit = $(if ($isCr) { $amt } else { 0 })
          amount = $amt
          narration = $narr
        }
      }
    }
  }
  $cursor = $chunkTo.AddDays(1)
}

# Receivables — with bill/due dates + overdue_days for dashboard aging
$rXml = New-TallyExportXml "Bills Receivable" $companyStatic
$rRes = Invoke-TallyXml "Bills Receivable" $rXml
if ($rRes) {
  [regex]::Matches($rRes, '<BILL[\s\S]*?</BILL>') | ForEach-Object {
    $b = $_.Value
    $party = if ($b -match '<LEDGERNAME>([^<]+)</LEDGERNAME>') { $Matches[1] } else { "" }
    $billNo = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    $amt = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $amt = Convert-TallyAmount $Matches[1] }
    if ($amt -eq 0) { return }
    $billDate = Format-TallyDate $(if ($b -match '<BILLDATE>(\d+)</BILLDATE>') { $Matches[1] } elseif ($b -match '<DATE>(\d+)</DATE>') { $Matches[1] } else { "" })
    $dueDate = Format-TallyDate $(if ($b -match '<BILLCREDITPERIOD>(\d+)</BILLCREDITPERIOD>') { $Matches[1] } elseif ($b -match '<DUEDATE>(\d+)</DUEDATE>') { $Matches[1] } else { "" })
    $parent = if ($ledgerParents.ContainsKey($party)) { $ledgerParents[$party] } else { "Sundry Debtors" }
    $overdue = Get-OverdueDays $dueDate
    Add-Row @{
      data_type = "receivable"
      party_name = $party
      ledger_name = $party
      parent_group = $parent
      bill_no = $billNo
      bill_date = $billDate
      due_date = $dueDate
      overdue_days = $overdue
      outstanding_amount = $amt
      amount = $amt
      description = "Receivable"
    }
  }
}

# Payables
$pXml = New-TallyExportXml "Bills Payable" $companyStatic
$pRes = Invoke-TallyXml "Bills Payable" $pXml
if ($pRes) {
  [regex]::Matches($pRes, '<BILL[\s\S]*?</BILL>') | ForEach-Object {
    $b = $_.Value
    $party = if ($b -match '<LEDGERNAME>([^<]+)</LEDGERNAME>') { $Matches[1] } else { "" }
    $billNo = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    $amt = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $amt = Convert-TallyAmount $Matches[1] }
    if ($amt -eq 0) { return }
    $dueDate = Format-TallyDate $(if ($b -match '<DUEDATE>(\d+)</DUEDATE>') { $Matches[1] } else { "" })
    $parent = if ($ledgerParents.ContainsKey($party)) { $ledgerParents[$party] } else { "Sundry Creditors" }
    Add-Row @{
      data_type = "payable"
      party_name = $party
      ledger_name = $party
      parent_group = $parent
      bill_no = $billNo
      due_date = $dueDate
      overdue_days = (Get-OverdueDays $dueDate)
      outstanding_amount = $amt
      amount = $amt
      description = "Payable"
    }
  }
}

if ($all.Count -eq 0) { Write-Log "No Tally rows parsed" "WARN"; exit 0 }

$records = $all | ForEach-Object {
  $h = @{}
  $_.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }
  $h
}

$payload = @{ action = "tally_finance"; records = @($records) } | ConvertTo-Json -Depth 8 -Compress
$webappOk = $false
try {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Write-Log "Google webapp POST START url=$WebAppUrl records=$($records.Count) bytes=$($payload.Length) timeout=180s"
  $res = Invoke-RestMethod -Uri $WebAppUrl -Method POST -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 180
  $sw.Stop()
  Write-Log "Google webapp POST OK ms=$($sw.ElapsedMilliseconds) response=$(Get-Preview ($res | ConvertTo-Json -Compress) 500)"
  Write-Host "Webapp OK: $($all.Count) rows -> 06_Finance_Sync | $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
  $webappOk = $true
} catch {
  if ($sw) { $sw.Stop() }
  Write-Log "Google webapp POST FAIL ms=$($sw.ElapsedMilliseconds) error=$($_.Exception.Message)" "ERROR"
  Write-Host "Webapp POST failed: $_" -ForegroundColor Yellow
  Write-Host "  (Common fix: Apps Script redeploy with Anyone access)" -ForegroundColor Yellow
}

$fbosWebhook = $FbosWebhookUrl
$syncSecret = $SyncSecret
if (-not $fbosWebhook) {
  Write-Host "Tip: set FBOS_TALLY_WEBHOOK_URL=https://your-fbos-host/api/webhooks/tally-finance for Supabase ingest fallback" -ForegroundColor DarkGray
} elseif (-not $syncSecret) {
  Write-Host "FBOS webhook skipped — SHEET_SYNC_SECRET not set" -ForegroundColor Yellow
} else {
  try {
    $fbosPayload = @{ action = "tally_finance"; secret = $syncSecret; records = @($records) } | ConvertTo-Json -Depth 8 -Compress
    $headers = @{ Authorization = "Bearer $syncSecret"; "Content-Type" = "application/json; charset=utf-8" }
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Log "FBOS webhook POST START url=$fbosWebhook records=$($records.Count) bytes=$($fbosPayload.Length) timeout=180s"
    $fbosRes = Invoke-RestMethod -Uri $fbosWebhook -Method POST -Body $fbosPayload -Headers $headers -TimeoutSec 180
    $sw.Stop()
    Write-Log "FBOS webhook POST OK ms=$($sw.ElapsedMilliseconds) response=$(Get-Preview ($fbosRes | ConvertTo-Json -Compress) 500)"
    Write-Host "FBOS webhook OK: $($fbosRes | ConvertTo-Json -Compress)" -ForegroundColor Green
  } catch {
    if ($sw) { $sw.Stop() }
    Write-Log "FBOS webhook POST FAIL ms=$($sw.ElapsedMilliseconds) error=$($_.Exception.Message)" "ERROR"
    Write-Host "FBOS webhook failed: $_" -ForegroundColor Red
  }
}

if (-not $webappOk -and -not $fbosWebhook) { exit 1 }
Write-Log "FBOS Tally sync END rows=$($records.Count) webappOk=$webappOk webhookConfigured=$([bool]$fbosWebhook)"
