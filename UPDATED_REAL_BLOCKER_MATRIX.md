# FBOS V4 — Updated Real Blocker Matrix

**Date:** 2026-06-20 (recalculated after environment review)  
**Input:** Owner confirmed `.env.local` present on dev machine with Supabase, ClickUp, Google Sheets, webhook secret, and Tally values.  
**Audit workspace note:** `.env.local` is gitignored — not visible in cloud agent workspace; status below reflects **owner attestation**, not agent filesystem verification.  
**No code changes. No auth flag changes. No deploy. No migrations.**

---

## Environment review — confirmed present

| Variable group | Status |
|---|---|
| Supabase URL | ✅ In `.env.local` (owner confirmed) |
| Supabase Anon Key | ✅ In `.env.local` (owner confirmed) |
| Service Role Key | ✅ In `.env.local` (owner confirmed) |
| ClickUp Token + IDs | ✅ In `.env.local` (owner confirmed) |
| Google Sheet ID(s) | ✅ In `.env.local` (owner confirmed) |
| Google WebApp URL | ✅ In `.env.local` (owner confirmed) |
| `SHEET_SYNC_SECRET` | ✅ In `.env.local` (owner confirmed) |
| Tally Host / Port / Company | ✅ In `.env.local` (owner confirmed) |

---

## Summary counts

| Category | Previous | Now | Change |
|---|---:|---:|---|
| **Closed blockers** | 0 | **18** | +18 |
| **Remaining blockers** | 47 | **29** | −18 |
| **Technical blockers** | 12 | **12** | unchanged (code not touched) |
| **Owner blockers** | 35 | **11** | −24 |

---

## 1. Closed blockers

Credentials and environment items resolved by owner `.env.local` review:

| ID | Blocker | Was | Closed because |
|---|---|---|---|
| ~~A-01~~ | Minimum dev env (Supabase URL + anon key) | A | Owner confirmed in `.env.local` |
| ~~P0-05~~ | Service role key not available locally | P0 | Owner confirmed in `.env.local` |
| ~~P0-07~~ | `SHEET_SYNC_SECRET` not set locally | P0 | Owner confirmed in `.env.local` |
| ~~P0-08~~ | Google Sheet ID not set locally | P0 | Owner confirmed Sheet ID(s) in `.env.local` |
| ~~P1-02~~ | ClickUp API token not collected | P1 | Owner confirmed token + IDs in `.env.local` |
| ~~P1-08~~ | Hardcoded GAS URL only (no env) | P1 | Owner confirmed `GOOGLE_WEBAPP_URL` in `.env.local` *(B-10 still wires env-only in code)* |
| ~~P1-11~~ | Tally host/company not configured locally | P1 | Owner confirmed Tally vars in `.env.local` |
| ~~C-03~~ | Service role key for **local dev** | C | Present in `.env.local` *(prod/Vercel copy still open)* |
| ~~C-04~~ | `SHEET_SYNC_SECRET` for **local dev** | C | Present in `.env.local` *(GAS copy still open)* |
| ~~C-05~~ | Google Sheet ID + WebApp URL for **local dev** | C | Present in `.env.local` |
| ~~C-14~~ | Live ClickUp token for **local dev** | C | Present in `.env.local` |
| ~~MISS-04~~ | Supabase URL/keys missing | Missing items | Closed locally |
| ~~MISS-05~~ | ClickUp token missing | Missing items | Closed locally |
| ~~MISS-06~~ | Sheet ID missing | Missing items | Closed locally |
| ~~MISS-07~~ | GAS deployment URL missing locally | Missing items | Closed locally |
| ~~MISS-08~~ | Tally host/company missing locally | Missing items | Closed locally |
| ~~MISS-09~~ | `SHEET_SYNC_SECRET` missing | Missing items | Closed locally |
| ~~P0-04 partial~~ | No `.env.local` on dev machine | P0 | **Closed** — file exists per owner |

**Total closed: 18**

---

## 2. Remaining blockers

### By phase

| Phase | Remaining | Count |
|---|---|---:|
| **Before implementation starts** | Backup + approval | 2 |
| **Development (agent work)** | Build, auth, routes, docs | 12 |
| **MVP launch** | Hosting, GAS props, SMTP, prod env, security migrations | 11 |
| **Post-MVP** | Optional integrations, ops maturity | 17 |

**Total remaining: 29** (excluding post-MVP deferrals from active path = **12 active**)

### Remaining blocker list (active path only)

| ID | Blocker | Type | Phase |
|---|---|---|---|
| R-01 | Encrypted vault backup of `.env.local` | Owner | Pre-impl |
| R-02 | Explicit implementation phase approval | Owner | Pre-impl |
| R-03 | TypeScript / build failure | Technical | Dev |
| R-04 | Auth hard-disabled in code | Technical | Dev |
| R-05 | Middleware no-op in code | Technical | Dev |
| R-06 | Integration routes stubbed / unwired | Technical | Dev |
| R-07 | Missing `/api/integrations/health` | Technical | Dev |
| R-08 | Tab GIDs empty in `getSheetTabGids()` code | Technical + verify | Dev |
| R-09 | `.env.example` not committed | Technical | Dev |
| R-10 | GAS script properties synced with `.env.local` | Owner | Dev/test |
| R-11 | GAS `FBOS_WEBHOOK_URL` (needs hosting URL) | Owner + Agent | Launch |
| R-12 | Vercel project + prod env import | Owner | Launch |
| R-13 | Supabase Auth redirect URLs | Owner | Launch |
| R-14 | SMTP / auth email | Owner | Launch |
| R-15 | `finance_transactions` RLS policies | Technical | Launch |
| R-16 | Supabase SECURITY DEFINER / permissive RLS | Technical | Launch |
| R-17 | Secondary GitHub + Supabase admin | Owner | Launch |
| R-18 | Tally bridge + XML gateway verified on Windows | Owner | Dev/test *(if live Tally in scope)* |
| R-19 | Custom domain *(optional — Vercel URL OK for MVP)* | Owner | Post-MVP |

---

## 3. Technical blockers

*Require agent implementation — unchanged by `.env.local` presence. Code not modified in this review.*

| ID | Blocker | Evidence | Blocks | Phase |
|---|---|---|---|---|
| T-01 | **Build failure** | `npx tsc` / `npm run build` fail (11 TS errors) | `npm run validate`, production artifact | **Dev** |
| T-02 | **Auth hard-disabled** | `lib/auth/disabled.ts` → `return true` always | Real sessions, prod security | **Dev** (fix before prod) |
| T-03 | **Middleware no-op** | `middleware.ts` passes all traffic | Edge auth enforcement | **Dev** (fix before prod) |
| T-04 | **ClickUp route stub** | `app/api/integrations/clickup/sync/route.ts` placeholder | Live sync despite env + library | **Dev** |
| T-05 | **Integrations route stub** | `app/api/integrations/route.ts` 8-line placeholder | Integration hub data | **Dev** |
| T-06 | **Config/dedupe routes unprotected stubs** | No `authorize()` on 3 routes | Security when wired | **Dev** |
| T-07 | **Missing health route** | UI calls `/api/integrations/health` — file absent | Integration hub errors | **Dev** |
| T-08 | **Tab GIDs in code empty** | `getSheetTabGids()` returns `""` for all tabs | Multi-tab sync even if IDs in env | **Dev** |
| T-09 | **GAS URL hardcoded fallback** | `lib/google-config.ts` still has hardcoded URL | Env override exists but code drift | **Dev** |
| T-10 | **No `.env.example`** | Not in repo | Onboarding / Vercel template | **Dev** |
| T-11 | **`finance_transactions` RLS gap** | RLS on, zero policies | Finance table unusable via API | **Launch** |
| T-12 | **Supabase security linter issues** | 10× DEFINER callable by anon; permissive inserts | Production security posture | **Launch** |

**Technical blockers: 12** — all agent-resolvable after approval. Env being present unblocks **testing** once T-01–T-09 are fixed.

---

## 4. Owner blockers

*Still require owner action — not resolved by local `.env.local` alone.*

| ID | Blocker | Status | When needed |
|---|---|---|---|
| O-01 | **Encrypted vault backup** of full `.env.local` | **Open** — pending backup creation | Before implementation *(recommended gate)* |
| O-02 | **Implementation phase approval** | **Open** — not explicitly granted in env review | Before agent edits code |
| O-03 | **GAS script properties** match `.env.local` | **Unverified** | Before scheduled sheet sync works end-to-end |
| O-04 | **GAS project ID + trigger schedule** | **Unverified** | Before GAS ops handoff |
| O-05 | **Tab GIDs** (if not already in env under separate vars) | **Unverified** | Before multi-tab CSV/GID sync — code still empty |
| O-06 | **Vercel** team, project, GitHub connect, prod env | **Open** | Before deploy |
| O-07 | **Hosting URL** decision (`*.vercel.app` or custom domain) | **Open** | Before auth redirects + `FBOS_WEBHOOK_URL` |
| O-08 | **Supabase Auth redirect URLs** | **Open** | Before prod login |
| O-09 | **SMTP / email provider** | **Open** | Before prod user onboarding |
| O-10 | **Secondary GitHub + Supabase admin** | **Open** | Before launch (ops) |
| O-11 | **Tally bridge + XML gateway** on Windows machine | **Unverified** | Before live Tally sync *(env vars alone insufficient)* |

**Owner blockers: 11** — down from 35. **Only O-01 and O-02 gate implementation start.**

---

## Reclassification (A / B / C / D) — updated

### A — Immediate P0 (before development)

| ID | Blocker | Status |
|---|---|---|
| ~~A-01~~ Env on dev machine | ✅ **Closed** |
| A-02 Implementation approval | ⏳ **Open** |
| A-03 Vault backup | ⏳ **Open** (until backup created) |

**Remaining A-class: 2** (was 3)

---

### B — Development P0 (agent work)

| ID | Blocker | Status |
|---|---|---|
| B-01 → T-01 Build fix | ⏳ Open |
| B-02 → T-02 Auth restore | ⏳ Open |
| B-03 → T-03 Middleware wire | ⏳ Open |
| B-04 → T-10 `.env.example` | ⏳ Open |
| B-05 → T-04 ClickUp route | ⏳ Open |
| B-06 → T-05 Integrations route | ⏳ Open |
| B-07 → T-06 Route RBAC | ⏳ Open |
| B-08 → T-07 Health route | ⏳ Open |
| B-09 → T-08 Tab GIDs in code | ⏳ Open *(may need owner GID values if not in env)* |
| B-10 → T-09 Env-only GAS URL | ⏳ Open |
| B-11 Git checkpoint tag | ⏳ Open |
| B-12 Schema export | ⏳ Open *(can run now if `DATABASE_URL` in env)* |

**B-class: 12 — all still open (technical)**

---

### C — MVP Launch P0

| ID | Blocker | Status |
|---|---|---|
| C-01 Build passes | ⏳ Depends on T-01 |
| C-02 Auth + middleware prod-safe | ⏳ Depends on T-02, T-03 |
| ~~C-03~~ Service role locally | ✅ Closed |
| C-04 Secret in Vercel **+ GAS properties** | ⏳ Partial — local ✅, GAS unverified |
| ~~C-05~~ Sheet ID + WebApp locally | ✅ Closed |
| C-06 GAS properties fully set | ⏳ Open (O-03) |
| C-07 `FBOS_WEBHOOK_URL` | ⏳ Open (needs O-07) |
| C-08 Auth redirect URLs | ⏳ Open (O-08) |
| C-09 Vercel + env | ⏳ Open (O-06) |
| C-10 Hosting URL live | ⏳ Open (O-07) |
| C-11 SMTP | ⏳ Open (O-09) |
| C-12 → T-11 Finance RLS | ⏳ Open |
| C-13 → T-12 Security migrations | ⏳ Open |
| ~~C-14~~ ClickUp token locally | ✅ Closed |
| C-15 Secondary admins | ⏳ Open (O-10) |

**C-class remaining: 11** (was 15; 4 closed locally)

---

### D — Post-MVP (unchanged — defer)

WhatsApp, Twilio, AI, Google Drive, Storage, custom domain (if using Vercel URL), CI/CD, migration history, repo cleanup, recovery drill, GAS backup admin, etc.

---

## Can implementation begin after backup creation?

### **Yes — with two conditions**

| Condition | Status | Required? |
|---|---|---|
| **1. Encrypted vault backup created** | Pending (you said "after backup creation") | **Yes** — closes A-03 / O-01 |
| **2. Explicit implementation approval** | Not stated in env review message | **Yes** — closes A-02 / O-02 |

### What becomes unblocked immediately after backup + approval

| Work stream | Unblocked? |
|---|---|
| Fix TypeScript build errors (T-01) | ✅ Yes |
| Wire ClickUp / integrations routes (T-04, T-05) | ✅ Yes — token already in env |
| Create `.env.example` from known vars (T-10) | ✅ Yes |
| Run `npm run db:verify` locally | ✅ Yes — Supabase keys present |
| Local integration sync **testing** | ✅ Partial — after route wiring (T-04–T-06) |
| Schema export (B-12) | ✅ Yes — if `DATABASE_URL` also in env |

### What remains gated (do not do at implementation start unless approved)

| Item | Why wait |
|---|---|
| **Auth restore (T-02)** | You said do not change auth flags — schedule explicitly in implementation plan |
| **Middleware wire (T-03)** | Pair with auth restore; not before agreed sprint |
| **Production deploy** | C-class items (Vercel, SMTP, redirects) |
| **Supabase migrations (T-11, T-12)** | Separate approval per governance |
| **GAS property sync (O-03)** | Owner action in script.google.com — can parallel during dev |

### Recommended go/no-go

```
✅ .env.local present          → CLOSED
⏳ Vault backup created        → DO THIS NEXT
⏳ "Approved to implement"      → EXPLICIT YES REQUIRED
→ THEN agent may begin Class B technical work
→ Auth/middleware changes ONLY when you approve that sub-phase
→ Migrations/deploy remain blocked until separate approval
```

---

## Before vs after comparison

| Metric | Before env review | After env review |
|---|---|---|
| Immediate P0 (A) | 3 | **2** |
| Blocks dev today | Env + approval + backup | **Approval + backup only** |
| Credential readiness (est.) | 17% | **~62%** *(local dev complete; prod/vault/GAS unverified)* |
| Owner actions to start dev | 5 | **2** (backup + approve) |
| Technical blockers | 12 | **12** (unchanged — code untouched) |

---

## Next actions (ordered)

| # | Who | Action |
|---|---|---|
| 1 | **Owner** | Create encrypted vault backup of full `.env.local` |
| 2 | **Owner** | Reply **"Approved to implement"** (Class B technical work) |
| 3 | **Agent** | B-01: Fix build errors *(first PR)* |
| 4 | **Agent** | B-04, B-05, B-07, B-08: Routes + `.env.example` |
| 5 | **Owner** | Verify GAS script properties match env (O-03) |
| 6 | **Owner + Agent** | Auth/middleware sub-phase — **only when explicitly approved** |
| 7 | **Owner** | Vercel + SMTP + redirects — before launch |

---

## ⛔ Status

Recalculation complete. **18 blockers closed** by environment review. **Implementation may begin after vault backup + explicit approval.** Auth flags unchanged. No code modified in this report.
