@echo off
REM Quick Tally HTTP gateway test on WSIPL-89-72 (run inside TS Plus session)
setlocal
echo Testing http://127.0.0.1:9007 ...
powershell -NoProfile -Command ^
  "$body = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>Flexiflair Tech Private Limited</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>'; try { $r = Invoke-WebRequest -Uri http://127.0.0.1:9007 -Method POST -Body $body -ContentType 'text/xml' -UseBasicParsing -TimeoutSec 30; Write-Host ('PASS HTTP ' + $r.StatusCode); Write-Host ($r.Content.Substring(0, [Math]::Min(400, $r.Content.Length))) } catch { Write-Host ('FAIL ' + $_.Exception.Message) -ForegroundColor Red }"
echo.
pause
