# FBOS V4 — Real Blocker Matrix

**Date:** 2026-06-20  
**Purpose:** Reclassify audit blockers by **when** they actually stop work — not treating optional integrations as immediate blockers.  
**Sources:** `BLOCKER_REGISTER.md`, `AUDIT_REPORT.md`, `MISSING_ITEMS_REPORT.md`, `P0_BLOCKER_STATUS.md`, `BACKUP_STATUS.md`, `CREDENTIAL_COLLECTION_STATUS.md`  
**No code changes. No deploy. No migrations.**

---

## Classification key

| Class | Name | Meaning |
|---|---|---|
| **A** | Immediate P0 | Must resolve **before any development session** can proceed productively |
| **B** | Development P0 | Must resolve **during implementation phase** before feature work merges |
| **C** | MVP Launch P0 | Must resolve **before production go-live** |
| **D** | Post-MVP | Defer until after launch |

**Reclassification principle:** Missing WhatsApp, Twilio, AI, Google Drive, file storage, and live Tally are **not** development or immediate blockers. Demo/mock paths exist for ClickUp and Tally during build-out.

---

## Direct answers

### 1. Which blockers prevent development today?

**Only two classes actually stop development today:**

| Blocker | Why it stops dev | Class |
|---|---|---|
| **Minimum local env not available** — no `.env.local` with at least `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DB-connected pages, auth testing, and `npm run db:verify` cannot run | **A** |
| **No implementation approval** | Governance mode — fixes and wiring blocked by policy | **A** |

**Does NOT prevent local development today (common misclassification):**

| Item | Why it is NOT a dev blocker |
|---|---|
| Auth hard-disabled (P0-01) | **Enables** careless local dev; blocks prod, not coding |
| Middleware no-op (P0-02) | Same — local dev runs; fix before prod |
| Build failure (P0-03) | Blocks `npm run build` / `validate`; **`npm run dev` can still run** |
| Missing ClickUp / Tally / WhatsApp / AI | Demo/mock paths exist; optional for dev |
| Missing Vercel / domain / SMTP | Local-only dev unaffected |
| Single-owner risk (P0-09) | Ops risk, not a coding blocker |
| Missing GAS / sheet GIDs | Blocks live sync testing, not UI/route development |

---

### 2. Which blockers prevent MVP launch?

| Blocker | Original ID | Class |
|---|---|---|
| Auth restore (`isAuthDisabled` env-gated, prod flags off) | P0-01 | **C** |
| Real session middleware wired | P0-02 | **C** |
| Production build passes | P0-03 | **C** |
| `.env.example` + production env on host | P0-04, P0-06 | **C** |
| `SHEET_SYNC_SECRET` synced (Next.js + GAS) | P0-07 | **C** |
| Google Sheet ID + confirmed GAS deployment URL | P0-08 | **C** |
| GAS script properties set (Supabase, sheet, webhook) | P1-12 | **C** |
| Auth redirect URLs in Supabase | P0-10 | **C** |
| Vercel project + GitHub connected + env imported | P1-09, P0-06 | **C** |
| Hosting URL (`*.vercel.app` minimum; custom domain optional for MVP) | P1-10 | **C** (partial — Vercel URL suffices) |
| SMTP or Supabase Auth email working | P1-18 | **C** |
| Integration stub routes get `authorize()` before live data | P1-01 | **C** |
| `finance_transactions` RLS policies | P1-05 | **C** (if finance MVP in scope) |
| Supabase SECURITY DEFINER / permissive RLS fixes | P1-15, P1-16 | **C** |
| Tab GIDs populated for multi-tab sheet sync | P1-13 | **C** |
| Live ClickUp token | P1-02 | **C** *only if* ClickUp sync is MVP-critical |

**MVP can use Vercel preview URL** — custom domain is **not** required for MVP if redirects configured to Vercel URL.

---

### 3. Which blockers can be deferred?

| Blocker | Original ID | Class | Notes |
|---|---|---|---|
| WhatsApp | P2-01 | **D** | No code |
| Twilio | P2-02 | **D** | No code |
| AI providers | P2-03 | **D** | Scaffold pages only |
| Google Drive | P2-04 | **D** | Not referenced |
| Supabase Storage buckets | P2-05 | **D** | No upload flows |
| Live Tally / bridge / XML gateway | P1-11 | **D** | Demo XML works; finance queue optional for MVP |
| Custom production domain + DNS | P1-10 | **D** | Use `*.vercel.app` first |
| CI/CD pipeline | P2-06 | **D** | Manual deploy OK for MVP |
| Migration history reconciliation | P1-06 | **D** | Live DB already exists |
| Empty `005_leads_clickup_dedupe.sql` | P1-07 | **D** | Only if running fresh DB restore |
| Repo audit artifact cleanup | P2-07 | **D** | Hygiene |
| npm moderate vulnerabilities | P2-08 | **D** | Low urgency |
| Lint errors in GAS scripts | P2-09 | **D** | Tooling only |
| Package rename fbos-v1 → fbosv4 | P2-10 | **D** | Cosmetic |
| Next.js middleware→proxy migration | P2-11 | **D** | Warning only |
| Second Supabase project `financeos` scope | P2-12 | **D** | Architecture doc |
| ClickUp live sync | P1-02, P1-03 | **D** *or* **C** | Defer if MVP = sheets-only; promote to C if leads-from-ClickUp required |
| Encrypted off-site backups / recovery drill | P1-14, BACKUP | **D** for launch; **A** for ops maturity | Strongly recommended pre-launch but not a code blocker |
| Secondary admin accounts | P0-09 | **D** for dev; **C** for ops | Ownership, not coding |

---

### 4. Which missing items can be generated automatically by the project?

| Item | How | When |
|---|---|---|
| `.env.example` | Generate from codebase `process.env.*` scan | **B** — implementation phase |
| `SHEET_SYNC_SECRET` | `openssl rand -hex 32` or equivalent | **B/C** — once owner approves secret creation |
| Git checkpoint tag | `git tag checkpoint-YYYYMMDD` on `main` | **B** |
| Supabase schema export | `pg_dump --schema-only` via script once `DATABASE_URL` in env | **B** |
| `/api/integrations/health` stub | Implement minimal route | **B** |
| `getSheetTabGids()` structure | Code update once owner supplies GID values | **B** |
| Wire ClickUp route to existing library | Code change | **B** |
| Wire integrations route | Code change | **B** |
| Restore env-gated auth + middleware | Code change | **B** |
| Fix TypeScript build errors | Code change | **B** |
| `finance_transactions` RLS migration SQL | Draft from existing policy patterns | **C** |
| Revoke anon EXECUTE on SECURITY DEFINER functions | Migration SQL | **C** |
| Vercel env import template | Export from `.env.example` mapping | **C** |
| Demo data for ClickUp / Tally during dev | **Already exists** in codebase | Now |

**Cannot be auto-generated (require external account/data):**

- Supabase anon/service keys, DB password
- Google Sheet URL, ID, tab GIDs (GIDs come from owner's browser URL)
- GAS project ID, deployment URL confirmation, Google account access
- ClickUp API token
- Tally live host/company (machine-specific)
- Domain registrar/DNS credentials
- Vercel team ownership (account creation)
- SMTP provider credentials
- Secondary admin invitations (owner must click invite)

---

### 5. Which items require owner input?

See **`OWNER_ACTIONS_ONLY.md`** for the minimal list. Summary:

| Category | Owner must provide |
|---|---|
| **Gate** | Written approval to begin implementation phase |
| **Secrets** | Supabase keys, sheet ID, GAS access, ClickUp token (if live), env vault backup |
| **Accounts** | Secondary GitHub + Supabase admin; Google sheet/GAS owners |
| **Decisions** | MVP scope (ClickUp live vs demo), hosting URL strategy, SMTP provider |
| **Infrastructure** | Vercel account/project creation; domain (if not using Vercel URL) |
| **Tally** | Only if live finance sync in MVP — else defer |

---

## Full reclassification matrix

### A — Immediate P0 (before any development)

| ID | Blocker | Owner / Agent | Status |
|---|---|---|---|
| A-01 | Minimum dev env: Supabase URL + anon key in `.env.local` | **Owner** | Missing |
| A-02 | Implementation phase approval | **Owner** | Pending |
| A-03 | Env secrets backed up to encrypted vault | **Owner** | Missing |

*3 items. Everything else can wait until implementation starts.*

---

### B — Development P0 (before implementation merges)

| ID | Blocker | Owner / Agent | Auto? |
|---|---|---|---|
| B-01 | Fix TypeScript build errors | Agent | Code |
| B-02 | Restore env-gated auth (`isAuthDisabled`) | Agent | Code |
| B-03 | Wire real middleware (or Next 16 proxy) | Agent | Code |
| B-04 | Create `.env.example` | Agent | **Auto** |
| B-05 | Wire ClickUp sync route to library | Agent | Code |
| B-06 | Restore integrations API route | Agent | Code |
| B-07 | Add `authorize()` to stub integration routes | Agent | Code |
| B-08 | Add `/api/integrations/health` or remove UI call | Agent | Code |
| B-09 | Populate tab GIDs in code once owner supplies values | Agent + Owner GIDs | Partial |
| B-10 | Move GAS URL to env-only (remove hardcode reliance) | Agent | Code |
| B-11 | Git checkpoint tag on `main` | Agent | **Auto** |
| B-12 | Schema export script run | Agent | **Auto** (needs owner DB URL) |

*12 items — all code/docs except B-09 GID values from owner.*

---

### C — MVP Launch P0 (before production)

| ID | Blocker | Owner / Agent |
|---|---|---|
| C-01 | Production build passes | Agent (B-01) |
| C-02 | Auth + middleware active with prod flags off | Agent (B-02, B-03) |
| C-03 | `SUPABASE_SERVICE_ROLE_KEY` in prod env | Owner |
| C-04 | `SHEET_SYNC_SECRET` generated + in Vercel + GAS | Agent generates; Owner confirms GAS access |
| C-05 | Google Sheet ID confirmed + GAS deployment URL verified | Owner |
| C-06 | GAS script properties fully set | Owner (with agent-provided values) |
| C-07 | `FBOS_WEBHOOK_URL` → production host | Agent + Owner URL decision |
| C-08 | Supabase Auth redirect URLs | Owner + Agent |
| C-09 | Vercel project created, GitHub connected, env imported | Owner creates; Agent supplies env list |
| C-10 | Hosting URL live (`*.vercel.app` or custom domain) | Owner |
| C-11 | SMTP / Supabase Auth email configured | Owner |
| C-12 | `finance_transactions` RLS policies | Agent (migration, approved) |
| C-13 | Supabase security linter fixes (DEFINER/RLS) | Agent (migration, approved) |
| C-14 | Live ClickUp token *(if MVP includes ClickUp)* | Owner — **skip if demo OK for MVP** |
| C-15 | Secondary GitHub + Supabase admin | Owner |

*15 items — 6 require owner; rest agent after approval.*

---

### D — Post-MVP

| ID | Blocker | Original |
|---|---|---|
| D-01 | WhatsApp integration | P2-01 |
| D-02 | Twilio | P2-02 |
| D-03 | AI providers | P2-03 |
| D-04 | Google Drive | P2-04 |
| D-05 | File storage buckets | P2-05 |
| D-06 | Live Tally + Windows bridge | P1-11 |
| D-07 | Custom domain + DNS (if using Vercel URL for MVP) | P1-10 |
| D-08 | CI/CD pipeline | P2-06 |
| D-09 | Migration history reconciliation | P1-06 |
| D-10 | Empty `005` migration file | P1-07 |
| D-11 | Repo artifact cleanup | P2-07 |
| D-12 | npm audit / lint cleanup | P2-08, P2-09 |
| D-13 | Package rename | P2-10 |
| D-14 | Middleware→proxy migration | P2-11 |
| D-15 | `financeos` project scope doc | P2-12 |
| D-16 | Formal recovery drill + off-site backups | P1-14, BACKUP |
| D-17 | GAS backup admin | Missing items report |

---

## Count summary

| Class | Count | Blocks dev today? | Blocks MVP? |
|---|---:|---|---|
| **A** Immediate P0 | 3 | **Yes** | — |
| **B** Development P0 | 12 | No (after A cleared) | — |
| **C** MVP Launch P0 | 15 | No | **Yes** |
| **D** Post-MVP | 17 | No | No |

**Previous register had 10 undifferentiated P0s** — reclassified to **3 immediate + 12 development + 15 launch**, with optional integrations moved to **D**.

---

## Recommended sequence

```
A (owner: env + approval)
  → B (agent: build, auth, routes, .env.example)
    → C (owner: Vercel, GAS, secrets, SMTP + agent: migrations, deploy)
      → D (post-launch)
```

---

## ⛔ Status

Reclassification complete. No code modified. Awaiting owner **A-01** (dev env), **A-02** (approval), **A-03** (vault backup).
