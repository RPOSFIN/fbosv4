# FBOS V4 — Missing Items Only

**Date:** 2026-06-20  
**Scope:** Unverified or not yet supplied — excludes items already confirmed in audit.  
**No code changes. No deploy. No migrations.**

---

## GitHub

| Item | Status | Owner action |
|---|---|---|
| Secondary Admin Account | **Missing** | Invite one GitHub user with **Admin** on `RPOSFIN/fbosv4` |

---

## Supabase

| Item | Status | Owner action |
|---|---|---|
| Service Role Key backed up? | **Unverified — treat as No** | Copy from Dashboard → API → `service_role`; store in encrypted vault |
| Database Password backed up? | **Unverified — treat as No** | Copy from Dashboard → Database → connection string / password; store in vault |
| Secondary Admin Account | **Missing** | Invite second **Owner/Admin** on Supabase org `RPOS` |

---

## Google Sheets

| Item | Status | Owner action |
|---|---|---|
| Master Spreadsheet URL | **Missing** | Provide full `https://docs.google.com/spreadsheets/d/.../edit` |
| Spreadsheet ID | **Missing** | Extract from URL; set in env |
| Tab Names | **Partial — unverified** | Confirm live names match expected: `07_Lead_CRM`, `06_Finance_Sync`, clients/orders tab |
| Tab GIDs | **Missing** | Copy `gid=` from each tab URL |
| Owner Account | **Missing** | Google account email that owns the sheet |

---

## Google Apps Script

| Item | Status | Owner action |
|---|---|---|
| Apps Script Project ID | **Missing** | From script.google.com project URL / settings |
| Deployment URL | **Unverified** | Confirm production `/exec` URL (repo has one hardcoded copy — not verified as current) |
| Google Account Owner | **Missing** | Email of account that deploys the script |
| Backup Admin | **Missing** | Second Google account with Editor on script project |
| Trigger Schedule | **Unverified** | Confirm in Apps Script → Triggers (expected: ~every 2 hours) |

---

## ClickUp

| Item | Status | Owner action |
|---|---|---|
| API Token Ready? | **No** | Create Personal API Token → vault → `CLICKUP_API_TOKEN` |
| Workspace Name | **Missing** | From ClickUp workspace switcher |
| Workspace ID | **Missing** | From ClickUp URL or API |
| Space ID | **Missing** | From target Space URL |
| Folder ID | **Missing** | From target Folder URL |
| List ID | **Missing** | From target List URL |

---

## Tally

| Item | Status | Owner action |
|---|---|---|
| Tally Version | **Missing** | Tally → About on bridge machine |
| Company Name | **Unverified** | Confirm exact name for `TALLY_COMPANY_NAME` (code defaults exist — not verified) |
| Host/IP | **Unverified** | Production host/IP (bridge script shows `localhost:9007` only) |
| Port | **Unverified** | Confirm gateway port (9000 vs 9007 mismatch in codebase) |
| XML API Enabled? | **Unverified — treat as No** | Confirm Tally HTTP/XML gateway enabled on bridge machine |

---

## Domain

| Item | Status | Owner action |
|---|---|---|
| Domain Name | **Missing** | Decide production hostname |
| Registrar | **Missing** | Document registrar account |
| DNS Provider | **Missing** | Document DNS login (registrar or Cloudflare) |

---

## Vercel

| Item | Status | Owner action |
|---|---|---|
| Vercel Team Name | **Missing** | Create or name Vercel team |
| Vercel Owner Account | **Missing** | Document Vercel login email |
| GitHub Connected? | **No** | Connect `RPOSFIN/fbosv4` when project is created |

---

## SMTP

| Item | Status | Owner action |
|---|---|---|
| Provider | **Missing** | Choose: Supabase default, Gmail, Resend, SendGrid, etc. |
| SMTP Host | **Missing** | From provider docs |
| SMTP Username | **Missing** | From provider dashboard |

---

## Count

| Category | Missing / unverified items |
|---|---:|
| GitHub | 1 |
| Supabase | 3 |
| Google Sheets | 5 |
| Google Apps Script | 5 |
| ClickUp | 6 |
| Tally | 5 |
| Domain | 3 |
| Vercel | 3 |
| SMTP | 3 |
| **Total** | **34** |

---

## Owner supply checklist (copy/paste when ready)

```
GitHub secondary admin: _______________
Supabase service role backed up: Yes / No
Supabase DB password backed up: Yes / No
Supabase secondary admin: _______________
Sheet URL: _______________
Sheet ID: _______________
Tab names + GIDs: _______________
Sheet owner: _______________
GAS project ID: _______________
GAS deployment URL: _______________
GAS owner: _______________
GAS backup admin: _______________
GAS triggers verified: Yes / No
ClickUp token ready: Yes / No
ClickUp workspace / space / folder / list IDs: _______________
Tally version / company / host / port / XML API: _______________
Domain / registrar / DNS: _______________
Vercel team / owner / GitHub connected: _______________
SMTP provider / host / username: _______________
```

**Status:** Awaiting owner input only. No implementation started.
