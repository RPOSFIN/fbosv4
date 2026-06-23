# ============================================
# FBOS Tally Bridge (PowerShell) — Port 9007
# Tally -> Google Apps Script (06_Finance_Sync)
# ============================================

# ---- CONFIG (env override supported on TS Plus server) ----
$FBOS_URL = if ($env:GOOGLE_WEBAPP_URL) {
  $env:GOOGLE_WEBAPP_URL
} else {
  "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec"
}
$SYNC_SECRET = if ($env:SHEET_SYNC_SECRET) { $env:SHEET_SYNC_SECRET } else { "" }
$TALLY = if ($env:TALLY_ENDPOINT) { $env:TALLY_ENDPOINT } else { "http://127.0.0.1:9007" }

# ============================================

function Send-ToTally($xmlPayload) {
    try {
        $resp = Invoke-WebRequest -Uri $TALLY -Method POST -Body $xmlPayload -ContentType "application/xml" -TimeoutSec 30 -UseBasicParsing
        if ($resp.StatusCode -eq 200) { return $resp.Content }
        Write-Host "Tally Error: $($resp.StatusCode)" -ForegroundColor Red
        return $null
    } catch {
        Write-Host "Tally connection failed: $_" -ForegroundColor Red
        return $null
    }
}

function Push-ToFBOS($records, $action="tally_finance") {
    if ($records.Count -eq 0) { Write-Host "No records to push."; return }
    $body = @{ action = $action; records = $records }
    if ($SYNC_SECRET -ne "") { $body.secret = $SYNC_SECRET }
    $json = $body | ConvertTo-Json -Depth 5
    try {
        Write-Host "Sending $($records.Count) records to FBOS..." -ForegroundColor Cyan
        $resp = Invoke-WebRequest -Uri $FBOS_URL -Method POST -Body $json -ContentType "application/json" -TimeoutSec 60 -UseBasicParsing
        Write-Host "FBOS Response: $($resp.StatusCode)" -ForegroundColor Green
        try { $r = $resp.Content | ConvertFrom-Json; Write-Host ($r | ConvertTo-Json -Compress) -ForegroundColor Green } catch { Write-Host $resp.Content -ForegroundColor Yellow }
    } catch {
        Write-Host "FBOS push failed: $_" -ForegroundColor Red
    }
}

function Parse-Ledgers($xmlText) {
    if (-not $xmlText) { return @() }
    $rows = @()
    try {
        [xml]$xml = $xmlText
        $ledgers = $xml.ENVELOPE.BODY.DATA.COLLECTION.LEDGER
        if (-not $ledgers) { $ledgers = $xml.SelectNodes("//LEDGER") }
        foreach ($led in $ledgers) {
            $name = if ($led.NAME) { $led.NAME } else { "" }
            $parent = if ($led.PARENT) { $led.PARENT } else { "" }
            $opening = if ($led.OPENINGBALANCE) { $led.OPENINGBALANCE -replace ',','' } else { 0 }
            $closing = if ($led.CLOSINGBALANCE) { $led.CLOSINGBALANCE -replace ',','' } else { 0 }
            $dtype = "ledger"
            if ($parent -match "bank|cash") { $dtype = "bank_cash" }
            elseif ($parent -match "sundry debtors|receivable") { $dtype = "receivable" }
            elseif ($parent -match "sundry creditors|payable") { $dtype = "payable" }
            $rows += @{
                data_type = $dtype
                company_name = "Flexiflair Tech Private Limited"
                ledger_name = $name
                parent_group = $parent
                opening_balance = [double]$opening
                closing_balance = [double]$closing
                amount = [double]$closing
                description = "Ledger: $name"
                debit = 0
                credit = 0
                voucher_date = (Get-Date -Format "yyyy-MM-dd")
                synced_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
            }
        }
    } catch { Write-Host "Ledger parse error: $_" -ForegroundColor Yellow }
    return $rows
}

function Parse-Vouchers($xmlText) {
    if (-not $xmlText) { return @() }
    $rows = @()
    try {
        [xml]$xml = $xmlText
        $vouchers = $xml.SelectNodes("//VOUCHER")
        foreach ($v in $vouchers) {
            $vtype = if ($v.VOUCHERTYPENAME) { $v.VOUCHERTYPENAME } else { "" }
            $vnum = if ($v.VOUUCHERNUMBER) { $v.VOUUCHERNUMBER } else { "" }
            $dateStr = if ($v.DATE) { $v.DATE } else { "" }
            $narration = if ($v.NARRATION) { $v.NARRATION } else { "" }
            # Parse date YYYYMMDD
            $vdate = if ($dateStr -and $dateStr.Length -eq 8) { "$($dateStr.Substring(0,4))-$($dateStr.Substring(4,2))-$($dateStr.Substring(6,2))" } else { (Get-Date -Format "yyyy-MM-dd") }
            $entries = $v.SelectNodes(".//ALLLEDGERENTRIES.LIST")
            foreach ($le in $entries) {
                $lname = if ($le.LEDGERNAME) { $le.LEDGERNAME } else { "" }
                $amtStr = if ($le.AMOUNT) { $le.AMOUNT -replace ',','' } else { 0 }
                $amt = [double]$amtStr
                $isDebit = $amt -gt 0
                $rows += @{
                    data_type = "voucher"
                    company_name = "Flexiflair Tech Private Limited"
                    voucher_type = $vtype
                    voucher_no = $vnum
                    voucher_date = $vdate
                    ledger_name = $lname
                    party_name = $lname
                    description = if ($narration) { $narration } else { "$vtype - $vnum" }
                    debit = if ($isDebit) { $amt } else { 0 }
                    credit = if (-not $isDebit) { [math]::Abs($amt) } else { 0 }
                    amount = [math]::Abs($amt)
                    narration = $narration
                    synced_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
                }
            }
        }
    } catch { Write-Host "Voucher parse error: $_" -ForegroundColor Yellow }
    return $rows
}

# ============================================
# MAIN
# ============================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FBOS Tally Bridge (PowerShell)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($FBOS_URL -like "*your-web-app*" -or $FBOS_URL -notlike "https://script.google.com/*") {
  Write-Host "`nERROR: Valid GOOGLE_WEBAPP_URL set karein (env ya is file mein).`n" -ForegroundColor Red
  Read-Host "Enter dabaen band karne ke liye"
  exit 1
}

# 1. Fetch Ledgers
Write-Host "`n[1/2] Tally se Ledgers fetch ho rahi hain..." -ForegroundColor Yellow
$xmlLedgers = @"
<EXPORTDATA>
  <REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME>
    <STATICVARIABLES><SVEXPORTFORMAT>`$`$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
  </REQUESTDESC>
</EXPORTDATA>
"@
$resp = Send-ToTally $xmlLedgers
$ledgers = Parse-Ledgers $resp
Write-Host "Ledgers mil gayi: $($ledgers.Count)" -ForegroundColor Green
if ($ledgers.Count -gt 0) { Push-ToFBOS $ledgers }

# 2. Fetch Daybook
Write-Host "`n[2/2] Tally se Daybook fetch ho rahi hain..." -ForegroundColor Yellow
$fromDate = Get-Date -Format "dd-MMM-yy"
$xmlDaybook = @"
<EXPORTDATA>
  <REQUESTDESC><REPORTNAME>Daybook</REPORTNAME>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>`$`$SysName:XML</SVEXPORTFORMAT>
      <SVFROMDATE>$fromDate</SVFROMDATE>
      <SVTODATE>$fromDate</SVTODATE>
    </STATICVARIABLES>
  </REQUESTDESC>
</EXPORTDATA>
"@
$resp2 = Send-ToTally $xmlDaybook
$vouchers = Parse-Vouchers $resp2
Write-Host "Vouchers mil gayi: $($vouchers.Count)" -ForegroundColor Green
if ($vouchers.Count -gt 0) { Push-ToFBOS $vouchers }

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Done! Total: $($ledgers.Count + $vouchers.Count) records" -ForegroundColor Cyan
Write-Host "  Google Sheet -> 06_Finance_Sync check karein" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Read-Host "`nEnter dabaen exit ke liye"
