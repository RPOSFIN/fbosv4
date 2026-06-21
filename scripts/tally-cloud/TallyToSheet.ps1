# TallyToSheet.ps1 — WSIPL-89-72 | ONE sheet tab 06_Finance_Sync
# Sab Tally data ek batch mein → Google Sheet → Supabase

param(
  [string]$TallyHost = "127.0.0.1",
  [int]$TallyPort = 9007,
  [string]$CompanyName = "Flexiflair Tech Private Limited",
  [string]$WebAppUrl = $env:GOOGLE_WEBAPP_URL,
  [string]$FromDate = "20260401",
  [string]$ToDate = "20270331"
)

$ErrorActionPreference = "Stop"
if (-not $WebAppUrl) { Write-Error "GOOGLE_WEBAPP_URL set karo"; exit 1 }

$endpoint = "http://${TallyHost}:${TallyPort}"
$companyEsc = [System.Security.SecurityElement]::Escape($CompanyName)
$syncedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$all = [System.Collections.Generic.List[object]]::new()
$ledgerParents = @{}

function Invoke-TallyXml([string]$Body) {
  try {
    return (Invoke-WebRequest -Uri $endpoint -Method POST -Body $Body -ContentType "text/xml" -TimeoutSec 120 -UseBasicParsing).Content
  } catch { Write-Warning $_; return $null }
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
$lXml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>List of Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>"
$lRes = Invoke-TallyXml $lXml
if ($lRes) {
  [regex]::Matches($lRes, '<LEDGER[\s\S]*?</LEDGER>') | ForEach-Object {
    $b = $_.Value
    $name = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    if (-not $name) { return }
    $parent = if ($b -match '<PARENT>([^<]+)</PARENT>') { $Matches[1] } else { "" }
    $ledgerParents[$name] = $parent
    $open = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $open = [Math]::Abs([decimal]$Matches[1]) }
    $close = 0; if ($b -match '<CLOSINGBALANCE>([^<]+)</CLOSINGBALANCE>') { $close = [Math]::Abs([decimal]$Matches[1]) }
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

# Vouchers — one row per ledger entry (parent_group for Sales/Expenses dashboard)
$vXml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Day Book</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY><SVFROMDATE>$FromDate</SVFROMDATE><SVTODATE>$ToDate</SVTODATE></STATICVARIABLES></DESC></BODY></ENVELOPE>"
$vRes = Invoke-TallyXml $vXml
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
      $amt = 0; if ($le -match '<AMOUNT>([^<]+)</AMOUNT>') { $amt = [Math]::Abs([decimal]$Matches[1]) }
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

# Receivables — with bill/due dates + overdue_days for dashboard aging
$rXml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Bills Receivable</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>"
$rRes = Invoke-TallyXml $rXml
if ($rRes) {
  [regex]::Matches($rRes, '<BILL[\s\S]*?</BILL>') | ForEach-Object {
    $b = $_.Value
    $party = if ($b -match '<LEDGERNAME>([^<]+)</LEDGERNAME>') { $Matches[1] } else { "" }
    $billNo = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    $amt = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $amt = [Math]::Abs([decimal]$Matches[1]) }
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
$pXml = "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Bills Payable</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>$companyEsc</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>"
$pRes = Invoke-TallyXml $pXml
if ($pRes) {
  [regex]::Matches($pRes, '<BILL[\s\S]*?</BILL>') | ForEach-Object {
    $b = $_.Value
    $party = if ($b -match '<LEDGERNAME>([^<]+)</LEDGERNAME>') { $Matches[1] } else { "" }
    $billNo = if ($b -match '<NAME>([^<]+)</NAME>') { $Matches[1] } else { "" }
    $amt = 0; if ($b -match '<OPENINGBALANCE>([^<]+)</OPENINGBALANCE>') { $amt = [Math]::Abs([decimal]$Matches[1]) }
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

if ($all.Count -eq 0) { Write-Host "No Tally rows parsed"; exit 0 }

$records = $all | ForEach-Object {
  $h = @{}
  $_.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }
  $h
}

$payload = @{ action = "tally_finance"; records = @($records) } | ConvertTo-Json -Depth 8 -Compress
$webappOk = $false
try {
  $res = Invoke-RestMethod -Uri $WebAppUrl -Method POST -Body $payload -ContentType "application/json; charset=utf-8" -TimeoutSec 180
  Write-Host "Webapp OK: $($all.Count) rows -> 06_Finance_Sync | $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
  $webappOk = $true
} catch {
  Write-Host "Webapp POST failed: $_" -ForegroundColor Yellow
  Write-Host "  (Common fix: Apps Script redeploy with Anyone access)" -ForegroundColor Yellow
}

$fbosWebhook = $env:FBOS_TALLY_WEBHOOK_URL
$syncSecret = $env:SHEET_SYNC_SECRET
if (-not $fbosWebhook) {
  Write-Host "Tip: set FBOS_TALLY_WEBHOOK_URL=https://your-fbos-host/api/webhooks/tally-finance for Supabase ingest fallback" -ForegroundColor DarkGray
} elseif (-not $syncSecret) {
  Write-Host "FBOS webhook skipped — SHEET_SYNC_SECRET not set" -ForegroundColor Yellow
} else {
  try {
    $fbosPayload = @{ action = "tally_finance"; secret = $syncSecret; records = @($records) } | ConvertTo-Json -Depth 8 -Compress
    $headers = @{ Authorization = "Bearer $syncSecret"; "Content-Type" = "application/json; charset=utf-8" }
    $fbosRes = Invoke-RestMethod -Uri $fbosWebhook -Method POST -Body $fbosPayload -Headers $headers -TimeoutSec 180
    Write-Host "FBOS webhook OK: $($fbosRes | ConvertTo-Json -Compress)" -ForegroundColor Green
  } catch {
    Write-Host "FBOS webhook failed: $_" -ForegroundColor Red
  }
}

if (-not $webappOk -and -not $fbosWebhook) { exit 1 }
