# Tally Cloud + TS Plus — Kya Open Karna Hai

**Server:** WSIPL-89-72  
**Company:** Flexiflair Tech Private Limited  
**Gateway port:** 9007

---

## TS Plus par (aap abhi yahan ho)

### Step 1 — Tally mein HTTP/XML Gateway ON karo

1. Tally open karo (Flexiflair company load ho)
2. **F12** → **Advanced Configuration** (ya Configure)
3. **Connectivity** → **Client/Server Configuration**
4. Enable:
   - **TallyPrime/Tally.ERP acts as** → **Both** (ya Server)
   - **Enable ODBC / HTTP server** → **Yes**
   - **Port** → **9007**
5. Save + Tally restart

### Step 2 — Server par local test (TS Plus session mein)

PowerShell (Admin):

```powershell
$body = '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>Flexiflair Tech Private Limited</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>'
Invoke-WebRequest -Uri http://127.0.0.1:9007 -Method POST -Body $body -ContentType "text/xml" -UseBasicParsing
```

**PASS** = XML response aata hai (LEDGER tags dikhenge)  
**FAIL** = connection refused → Tally gateway port 9007 enable nahi hai

### Step 3 — One-click full setup (recommended)

TS Plus session mein **Admin**:

```cmd
cd scripts\tally-cloud
Setup-TallyCloud.bat
```

Ye automatically karega:
1. Tally gateway test (`127.0.0.1:9007`)
2. Webapp health check
3. Task Scheduler install (har 2h)
4. Pehli sync → `06_Finance_Sync`
5. Report file: `FBOS-Tally-Setup-Report.json`

Individual scripts:

```cmd
Test-TallyGateway.bat
Install-TallySync.bat
Run-TallySync-Now.bat
```

Ye karega:
- `TallyToSheet.ps1` → har 2 ghante Task Scheduler
- `GOOGLE_WEBAPP_URL` machine env set
- Tally host = **127.0.0.1:9007** (same machine)

Success = Sheet tab **06_Finance_Sync** mein rows + **00_Sync_Status** mein tally log

---

## Windows Firewall — kya open karna hai

| Port | Direction | Kab chahiye |
|------|-----------|-------------|
| **9007** | Inbound TCP | Jab dev laptop / FBOS app **server se bahar** se Tally ko call kare |
| **3389** | Inbound | TS Plus / RDP (already open — aap connected ho) |
| **443** | Outbound | Google Sheet webapp + Supabase (server → internet) |

**TS Plus session ke andar** sirf **127.0.0.1:9007** chahiye — firewall rule optional (local loopback).

**Dev laptop se direct Tally call** ke liye:
1. Server ka **internal IP** lo (e.g. `192.168.x.x`) — `ipconfig` on WSIPL-89-72
2. Windows Firewall → Inbound Rule → **TCP 9007** allow
3. `.env.local` mein: `TALLY_HOST=192.168.x.x` ya `WSIPL-89-72` (agar DNS resolve ho)

---

## FBOS `.env.local` (dev machine)

```bash
TALLY_HOST=WSIPL-89-72
TALLY_PORT=9007
TALLY_COMPANY_NAME=Flexiflair Tech Private Limited
GOOGLE_WEBAPP_URL=https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec
```

Restart: `npm run dev`

---

## FBOS API test commands

```bash
# Status
curl http://localhost:3000/api/integrations/tally/status

# Connection test (from dev PC — server reachable hona chahiye)
curl -X POST http://localhost:3000/api/integrations/tally/test \
  -H "Content-Type: application/json" \
  -d '{"host":"WSIPL-89-72","port":"9007","company":"Flexiflair Tech Private Limited"}'

# Sync
curl -X POST http://localhost:3000/api/integrations/tally/sync
```

---

## Do paths — kaunsa use karein

| Path | Kahan chalega | Best for |
|------|---------------|----------|
| **A: TallyToSheet.ps1** | WSIPL-89-72 server par | Production — har 2h Sheet + Supabase |
| **B: FBOS syncTally()** | Dev laptop / cloud | Test + manual sync |
| **C: FBOS webhook** | WSIPL-89-72 → FBOS URL | When GAS POST 405 — set `FBOS_TALLY_WEBHOOK_URL` + `SHEET_SYNC_SECRET` |

**Recommendation:** Path **A** on server (Setup-TallyCloud.bat). If webapp POST fails, use Path **C** webhook to FBOS.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `fetch failed` / DNS | Dev PC par hostname resolve nahi — server **IP** use karo |
| `connection refused :9007` | Tally F12 gateway enable + port 9007 |
| Demo mode dikhe | `TALLY_HOST` + `TALLY_COMPANY_NAME` set karo, dev server restart |
| Finance 0 in dashboard | Path A chalao — `06_Finance_Sync` rows check karo |
| POST webapp 405 / Page Not Found | Apps Script redeploy: Web app, Execute as Me, Anyone can access |
| Company name error | Tally F3 → Company Info → exact name copy karo |
