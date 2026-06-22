# FBOS Tally Integration Audit Report

**Date:** 2026-06-22  
**Scope:** `scripts/tally-cloud/Install-TallySync.ps1`, `scripts/tally-cloud/TallyToSheet.ps1`  
**Governance:** Backup-first, audit-before-patch. Original scripts were copied to `/tmp/fbos-tally-audit-backup-*` before edits.

## Current verified facts

- Tally is running on TSPlus server.
- Company: `Flexiflair Tech Private Limited`.
- Tally XML/HTTP listener is active on `0.0.0.0:9007`.
- Local TSPlus test `http://127.0.0.1:9007` returns:
  `<RESPONSE>TallyPrime Server is Running</RESPONSE>`
- Therefore, Tally service itself is not the blocker.

## Root cause classification

### 1. Installer error: `Requested registry access is not allowed`

**Location:** `scripts/tally-cloud/Install-TallySync.ps1`

Original lines:

```powershell
[System.Environment]::SetEnvironmentVariable("GOOGLE_WEBAPP_URL", $WebAppUrl, "Machine")
[System.Environment]::SetEnvironmentVariable("FBOS_TALLY_WEBHOOK_URL", $fbosWebhook, "Machine")
[System.Environment]::SetEnvironmentVariable("SHEET_SYNC_SECRET", $syncSecret, "Machine")
```

**Root cause:** TSPlus user/session does not have permission to write machine-level environment variables. This is a Windows registry permission restriction, not a Tally issue.

**Impact:** Because the scheduled task runs as `SYSTEM`, relying only on environment variables is fragile. If machine env writes fail, scheduled task may run without `GOOGLE_WEBAPP_URL`, webhook URL, or sync secret.

**Fix applied:** Machine env writes are now non-fatal. The installer passes critical values directly as scheduled task arguments:

- `-WebAppUrl`
- `-FbosWebhookUrl`
- `-SyncSecret`

This preserves the existing scheduled-task architecture and avoids the TSPlus registry blocker.

### 2. Timeout warning: `WARNING: The operation has timed out`

**Location:** `scripts/tally-cloud/TallyToSheet.ps1`

Original function:

```powershell
function Invoke-TallyXml([string]$Body) {
  try {
    return (Invoke-WebRequest -Uri $endpoint -Method POST -Body $Body -ContentType "text/xml" -TimeoutSec 120 -UseBasicParsing).Content
  } catch { Write-Warning $_; return $null }
}
```

**Root cause classification:** The observed exact warning format is emitted by `Invoke-TallyXml`, so the timeout is in one of the Tally XML requests, not the Google Apps Script request.

The original script makes four Tally XML calls:

1. `List of Ledgers`
2. `Day Book`
3. `Bills Receivable`
4. `Bills Payable`

The script previously did not log which call timed out. Given the large date range:

```powershell
FromDate = 20260401
ToDate   = 20270331
```

the most likely timeout is `Day Book`, because it can return a large voucher collection. `Bills Receivable` / `Bills Payable` may also be expensive depending on data size.

### Timeout type determination

| Candidate | Result |
|---|---|
| a) Tally request | **Likely / primary for observed `WARNING`** |
| b) Google Apps Script request | Not the observed warning format; Google failure path prints `Webapp POST failed:` |
| c) TLS/HTTPS issue | Not likely for observed warning because Tally endpoint is HTTP local |
| d) Payload size issue | Possible secondary issue after Tally returns large data; diagnostic logging now records payload size |
| e) Authentication issue | Not for Tally timeout; Google webapp/auth remains a separate known blocker |

## Minimal patch applied

### `Install-TallySync.ps1`

- Added safe machine-env setter:
  - tries machine env
  - logs permission failure
  - continues without aborting
- Scheduled task now passes required runtime values directly:
  - `-WebAppUrl`
  - `-FbosWebhookUrl`
  - `-SyncSecret`
- Test run path passes same parameters.

### `TallyToSheet.ps1`

Added minimal diagnostics:

- `-FbosWebhookUrl` parameter
- `-SyncSecret` parameter
- `-LogPath` parameter
- timestamped log lines to `TallyToSheet.log`
- Tally request timing:
  - request name
  - endpoint
  - timeout seconds
  - elapsed milliseconds
  - response size
  - response preview
  - exception message
- Google request timing:
  - payload size
  - elapsed milliseconds
  - response preview
  - exception message
- FBOS webhook timing:
  - payload size
  - elapsed milliseconds
  - response preview
  - exception message

No architecture redesign was introduced.

## Exact fix plan

1. Install patched scripts on TSPlus.
2. Run one manual diagnostic sync with a small date window first:

```powershell
cd C:\FBOS\TallySync
powershell -NoProfile -ExecutionPolicy Bypass -File .\TallyToSheet.ps1 `
  -TallyHost 127.0.0.1 `
  -TallyPort 9007 `
  -CompanyName "Flexiflair Tech Private Limited" `
  -WebAppUrl "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec" `
  -FromDate 20260401 `
  -ToDate 20260430
```

3. Read `TallyToSheet.log`.
4. If April passes, expand the date range.
5. If a specific Tally call times out, reduce date range or tune that report query.
6. If Tally succeeds but Google times out/fails, inspect the `Google webapp POST` log line:
   - elapsed ms
   - payload bytes
   - response preview / exception
7. If Apps Script POST still returns 405, redeploy Apps Script web app:
   - Execute as: Me
   - Who has access: Anyone
8. If registry access still fails during install, it is now non-fatal; verify task arguments contain the URL/secret.

## Validation commands

### Tally listener quick test

```powershell
$body = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>Flexiflair Tech Private Limited</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>'
Invoke-WebRequest -Uri http://127.0.0.1:9007 -Method POST -Body $body -ContentType "text/xml" -UseBasicParsing -TimeoutSec 30
```

### Manual diagnostic sync

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\TallyToSheet.ps1 `
  -TallyHost 127.0.0.1 `
  -TallyPort 9007 `
  -CompanyName "Flexiflair Tech Private Limited" `
  -WebAppUrl "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec" `
  -FromDate 20260401 `
  -ToDate 20260430
```

### Installer with registry-safe fallback

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-TallySync.ps1 `
  -WebAppUrl "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec" `
  -TallyHost 127.0.0.1 `
  -TallyPort 9007 `
  -CompanyName "Flexiflair Tech Private Limited" `
  -TestRun
```

### Inspect log

```powershell
Get-Content .\TallyToSheet.log -Tail 100
```

## PASS / FAIL criteria

### PASS

- Installer does not stop on `Requested registry access is not allowed`.
- Scheduled task is registered or manual test run completes.
- `TallyToSheet.log` shows each Tally request with `START` and either `OK` or `FAIL`.
- Timeout location is identified by request name.
- At least one output path succeeds:
  - Google webapp POST OK, or
  - FBOS webhook POST OK.
- Dashboard `finance_import_queue` count increases after sync.

### FAIL

- `List of Ledgers`, `Day Book`, `Bills Receivable`, or `Bills Payable` logs `FAIL ... timed out`.
- Google webapp POST logs failure/405 and no FBOS webhook is configured.
- Both Google webapp and FBOS webhook fail.
- No rows parsed from Tally after confirmed report responses.

## Next action if timeout persists

If `Day Book` times out, rerun with smaller windows:

```powershell
-FromDate 20260401 -ToDate 20260407
```

If weekly windows pass, schedule multiple smaller syncs or reduce the Day Book export range. This is a Tally report-size/runtime issue, not a port/connectivity issue.

