# FBOS V4 — Backup Plan (Phase 2)

**Governance audit date:** 2026-06-20  
**Mode:** Plan only — no backups executed, no files modified or deleted.

---

## Purpose

Define a repeatable backup strategy so FBOS V4 can be restored after hardware failure, accidental deletion, or environment loss. This phase validates **capability** only; it does not perform production backups.

---

## Backup Inventory Matrix

| # | Backup type | Capability verified | Current gap | Priority |
|---|---|---|---|---|
| 1 | Local ZIP backup | ✅ Yes (dry-run succeeded) | `.env` not in repo; must be backed up separately | P0 |
| 2 | Git checkpoint backup | ✅ Yes (remote `origin/main` exists) | Local HEAD detached; no tags/releases | P0 |
| 3 | Recovery installer package | ⚠️ Partial | Scripts exist but no unified installer manifest | P1 |
| 4 | Supabase schema export | ⚠️ Partial | SQL in `supabase/migrations/`; remote migration history empty | P0 |
| 5 | Environment backup checklist | ❌ No template | No `.env.example`; secrets location undocumented | P0 |

---

## 1. Local ZIP Backup

### Verified capability

Dry-run on 2026-06-20:

```bash
zip -r /tmp/fbos-backup-test.zip . -x 'node_modules/*' -x '.git/*'
# Result: 8.5 MB archive created successfully
```

### Recommended production procedure

```bash
# Run from project root on developer machine
DATE=$(date +%Y%m%d)
zip -r "fbosv4-backup-${DATE}.zip" . \
  -x 'node_modules/*' \
  -x '.next/*' \
  -x '.git/*' \
  -x '*.log'
```

### Include

- All source: `app/`, `lib/`, `components/`, `hooks/`, `scripts/`, `supabase/`
- Config: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `middleware.ts`
- Documentation and governance reports

### Exclude

- `node_modules/` (reinstall via `npm ci`)
- `.next/` (rebuild via `npm run build`)
- `.git/` (use Git remote as canonical history)

### Store off-machine

- Encrypted cloud drive (Google Drive / OneDrive) **or**
- GitHub release asset (private) **or**
- External USB encrypted with VeraCrypt

### Separate secure store (never in ZIP committed to Git)

- `.env.local` and all secrets (see Section 5)

---

## 2. Git Checkpoint Backup

### Verified capability

| Item | Status |
|---|---|
| Remote | `https://github.com/RPOSFIN/fbosv4` |
| Visibility | Private |
| Default branch | `main` |
| Latest commit | `a364445` |

### Recommended procedure

```bash
# On machine before risky work
git checkout main
git pull origin main
git tag -a "checkpoint-YYYYMMDD" -m "Pre-change governance checkpoint"
git push origin main --tags
```

### Checkpoint naming convention

```
checkpoint-YYYYMMDD          # routine save point
release-vX.Y.Z               # production candidate
pre-migration-YYYYMMDD       # before Supabase DDL
```

### Current gap

- Workspace is in **detached HEAD** at `a364445` — checkpoint tags should be created from `main` after returning to branch
- No release tags observed

---

## 3. Recovery Installer Package

### Verified components (exist in repo)

| Component | Path |
|---|---|
| Dependency manifest | `package.json`, `package-lock.json` |
| DB verify script | `scripts/verify-database.mjs` |
| Integration migration script | `scripts/apply-integrations-migration.mjs` |
| Finance hub setup | `scripts/setup-finance-hub.mjs` |
| Google Apps Script tooling | `scripts/google-apps-script/` |
| Tally bridge | `scripts/tally-cloud/` |
| Supabase SQL | `supabase/migrations/`, `supabase/schema.sql` |

### Missing for full installer package

- [ ] Single `INSTALL.md` or `recover.sh` entry point
- [ ] `.env.example` with all required variables
- [ ] Version-pinned Node requirement file (`.nvmrc` or `engines` in package.json)
- [ ] Post-restore verification script (build + db:verify + smoke URLs)
- [ ] Signed checksum manifest for integrity verification

### Proposed package structure (design only)

```
fbosv4-recovery-YYYYMMDD/
├── INSTALL.md
├── .env.example
├── source/              # git export or zip
├── supabase/
│   ├── schema-full.sql  # pg_dump --schema-only
│   └── migrations/
├── secrets-checklist.md # what to restore manually
└── verify.sh            # build + db:verify
```

---

## 4. Supabase Schema Export

### Verified sources

| Source | Location | Notes |
|---|---|---|
| Migration files | `supabase/migrations/001`–`006` | `005` is **empty** |
| Manual run scripts | `RUN_FINANCE_SETUP.sql`, `RUN_PENDING_INTEGRATIONS.sql`, etc. |
| Live schema | Supabase `fbosv4` — 22 tables, 41 RLS policies, 11 functions | Applied but not in migration history |

### Recommended export procedure (when approved)

**Option A — Supabase Dashboard**

1. Project `fbosv4` → Database → Backups (verify PITR enabled on plan)
2. SQL Editor → export schema via `pg_dump` from local CLI if linked

**Option B — CLI (preferred for reproducibility)**

```bash
# Requires Supabase DB connection string (store securely)
pg_dump "$DATABASE_URL" \
  --schema-only \
  --schema=public \
  --no-owner \
  --file="supabase/exports/schema-$(date +%Y%m%d).sql"
```

**Option C — Document repo SQL as source of truth**

1. Fix empty `005_leads_clickup_dedupe.sql`
2. Reconcile live DB vs `001`–`006`
3. Register migrations in Supabase migration table (future phase — not now)

### Current drift risk

- Remote `list_migrations` returns **0 rows** — live DB was likely built via manual SQL Editor runs
- Repo SQL may not fully represent live state without diff verification

---

## 5. Environment Backup Checklist

### Required variables (inferred from codebase — no `.env.example` exists)

#### Supabase (required)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Auth controls

- [ ] `NEXT_PUBLIC_AUTH_DISABLED` (must be `false` or unset in production)
- [ ] `FBOS_AUTH_DISABLED` (server-only; must be `false` or unset in production)

#### Google Sheets / Apps Script

- [ ] `NEXT_PUBLIC_GOOGLE_SHEET_ID` or `GOOGLE_SHEET_ID`
- [ ] `GOOGLE_WEBAPP_URL` / `GOOGLE_SHEETS_WEBAPP_URL` (or use code default — not recommended)
- [ ] `SHEET_SYNC_SECRET` / `GOOGLE_APPS_SCRIPT_SECRET`
- [ ] `GSHEET_CSV_URL` (optional fallback)

#### ClickUp

- [ ] `CLICKUP_API_TOKEN`
- [ ] `CLICKUP_TEAM_ID`, `CLICKUP_SPACE_ID`, `CLICKUP_FOLDER_ID`, `CLICKUP_LIST_ID` (optional)

#### Tally

- [ ] `TALLY_HOST` / `TALLY_SERVER_URL`
- [ ] `TALLY_PORT`
- [ ] `TALLY_COMPANY_NAME`

### Backup storage rules

| Secret type | Store in | Never store in |
|---|---|---|
| Service role key | Password manager / encrypted vault | Git, ZIP in cloud unencrypted |
| API tokens | Password manager | Slack, email, audit logs |
| Webhook secrets | `.env.local` + vault copy | Committed files |
| Anon key | `.env.local` (public client key — still protect) | N/A |

### Recovery test (quarterly)

1. Restore `.env.local` from vault to clean directory
2. `npm ci && npm run build`
3. `npm run db:verify`
4. Confirm Supabase project URL matches `fbosv4`

---

## Backup Schedule (recommended)

| Frequency | Action |
|---|---|
| **Daily** | Push code to `origin/main` |
| **Weekly** | Encrypted ZIP to off-site storage |
| **Before any migration** | Git tag + schema export |
| **Monthly** | Full recovery drill on clean VM (see Phase 3) |
| **On credential rotation** | Update vault + `.env.local` backup |

---

## Phase 2 Verdict

Backup **capability exists** for source code (Git + ZIP) but is **incomplete** for secrets, schema drift reconciliation, and one-command recovery. Environment backup is the highest-risk gap.

**Backup readiness score:** **52 / 100**

**Status:** ✅ Phase 2 complete — plan only, no backups executed. Awaiting approval.
