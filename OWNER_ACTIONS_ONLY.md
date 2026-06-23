# FBOS V4 — Owner Actions Only

**Date:** 2026-06-20  
**Scope:** Items that **absolutely require owner action** — excludes anything the project can auto-generate, mock, bypass, or implement later.  
**Companion:** `REAL_BLOCKER_MATRIX.md`  
**No code changes. No deploy. No migrations.**

---

## Gate (do first)

| # | Action | Why owner only |
|---|---|---|
| 1 | **Approve implementation phase** | Policy / authority |
| 2 | **Confirm MVP scope:** ClickUp live sync required at launch, or demo OK? | Product decision |
| 3 | **Confirm MVP scope:** Tally live sync required at launch, or defer? | Product decision |

---

## A — Required before development starts

| # | Action | Deliverable |
|---|---|---|
| 4 | Create `.env.local` on dev machine with at minimum: | File on laptop |
|   | `NEXT_PUBLIC_SUPABASE_URL` | Copy from Supabase Dashboard → API |
|   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copy from Supabase Dashboard → API |
| 5 | Back up full env secrets to **encrypted vault** (password manager) | Vault entry titled `FBOS V4 Secrets` |
|   | Include when available: `SUPABASE_SERVICE_ROLE_KEY`, `SHEET_SYNC_SECRET`, `CLICKUP_API_TOKEN` | |

*Agent can generate `.env.example` and `SHEET_SYNC_SECRET` — owner must store and approve.*

---

## B — Owner input needed during implementation (not before day 1)

These block specific features, **not** starting code work:

| # | Action | When needed | Blocks |
|---|---|---|---|
| 6 | Provide Google Sheet **URL + Spreadsheet ID** | Before live sheet sync testing | GAS + gsheet sync |
| 7 | Provide tab **GIDs** from browser URL (`gid=`) for: `07_Lead_CRM`, `06_Finance_Sync`, clients/orders tab | Before multi-tab sync | CSV/GID imports |
| 8 | Confirm **Google account email** that owns the sheet | Before sharing/troubleshooting | Access issues |
| 9 | Confirm **Apps Script deployment URL** is current (verify hardcoded URL in repo) | Before webhook testing | Wrong endpoint |
| 10 | Provide **Apps Script project ID** | Before GAS property setup | Script management |
| 11 | Set **GAS script properties** (owner clicks in script.google.com): | Before scheduled sync | Automation |
|    | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SPREADSHEET_ID`, `SYNC_SECRET`, `FBOS_WEBHOOK_URL` | | |
| 12 | Grant agent/ops **Editor** on Apps Script project (or set properties yourself) | Before GAS config | Cannot configure remotely |

*Agent generates secret values; owner pastes into GAS.*

---

## C — Required before MVP launch (owner-only)

| # | Action | Deliverable |
|---|---|---|
| 13 | Copy **`SUPABASE_SERVICE_ROLE_KEY`** to Vercel production env + vault | Env var set |
| 14 | Create **Vercel** team + project; connect `RPOSFIN/fbosv4` | Hosted project |
| 15 | Import all production env vars into Vercel | Dashboard configured |
| 16 | Choose **hosting URL**: Vercel `*.vercel.app` (minimum) or custom domain | URL for redirects |
| 17 | Configure **Supabase Auth redirect URLs** to match hosting URL | Supabase Dashboard → Auth |
| 18 | Choose **SMTP provider**; configure Supabase Auth email or SMTP credentials | Working login emails |
| 19 | Invite **secondary GitHub admin** on `RPOSFIN/fbosv4` | Second collaborator |
| 20 | Invite **secondary Supabase org admin** on org `RPOS` | Second org member |

### Conditional — only if MVP scope includes live integration

| # | Action | If |
|---|---|---|
| 21 | Create **ClickUp API token**; provide Space/Folder/List IDs | ClickUp live in MVP |
| 22 | Provide **Tally company name, host/IP, port**; confirm XML gateway enabled; install bridge on Windows | Tally live in MVP |
| 23 | Register **custom domain** + DNS access | Custom domain at launch (skip if Vercel URL OK) |

---

## Explicitly excluded (NOT owner actions now)

| Item | Handled by |
|---|---|
| Fix TypeScript build errors | Agent — implementation |
| Restore auth + middleware | Agent — implementation |
| `.env.example` template | Agent — auto-generate |
| Generate `SHEET_SYNC_SECRET` | Agent — auto-generate; owner stores |
| Wire ClickUp / integrations routes | Agent — implementation |
| RLS migration SQL | Agent — after approval |
| Git checkpoint tag | Agent |
| Schema export | Agent — once `DATABASE_URL` provided |
| ClickUp demo / Tally demo during dev | Code — already exists |
| WhatsApp, Twilio, AI, Google Drive, Storage | Post-MVP — defer |
| Live Tally (if deferred in scope decision #3) | Post-MVP |
| GAS backup admin | Post-MVP |
| Off-site ZIP / recovery drill | Post-MVP (recommended pre-launch) |
| npm audit / lint / package rename | Post-MVP |

---

## Minimum owner checklist (copy/paste)

### Before development (3 items)
```
[ ] Implementation phase approved
[ ] .env.local: SUPABASE_URL + ANON_KEY on dev machine
[ ] All secrets backed up to encrypted vault
```

### Before sheet/sync testing (when agent asks)
```
[ ] Sheet URL + ID: _______________
[ ] Tab GIDs: _______________
[ ] GAS deployment URL confirmed: _______________
[ ] GAS script properties set: Yes / No
```

### Before MVP launch
```
[ ] MVP scope — ClickUp live: Yes / No (demo OK: Yes / No)
[ ] MVP scope — Tally live: Yes / No
[ ] Service role key in Vercel: Yes / No
[ ] Vercel project + GitHub connected: Yes / No
[ ] Hosting URL: _______________
[ ] Supabase auth redirects configured: Yes / No
[ ] SMTP/email working: Yes / No
[ ] Secondary GitHub admin: _______________
[ ] Secondary Supabase admin: _______________
```

---

## Count

| Phase | Owner-only actions |
|---|---:|
| Gate | 3 |
| Before dev (A) | 2 (+ vault includes future keys) |
| During impl (B) | 7 |
| Before launch (C) | 8 (+ up to 3 conditional) |
| **Minimum to start dev** | **5** (approve + env + vault + scope decisions) |

---

## ⛔ Status

Nothing below this line requires owner action until implementation is approved and A-items are done. Agent work remains blocked by governance policy.

**No code modified.**
