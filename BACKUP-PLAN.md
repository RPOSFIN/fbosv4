# FBOS Backup Plan — CEO UI Rollup + GSheet Fix (2026-06-21)

## Latest checkpoint (v3 — GSheet sync stable)

| Item | Value |
|------|-------|
| **Branch** | `backup/fbos-ceo-ui-stable-2026-06-21` |
| **Tag** | `backup/fbos-ceo-ui-stable-2026-06-21` |
| **Work branch** | `cursor/ceo-ui-rollup-65ac` |
| **PR** | https://github.com/RPOSFIN/fbosv4/pull/16 |
| **Fixes** | GSheet stays connected after sync (`ok:true` webapp health + CSV fallback); sheet tab GIDs in `.env.example` |

## Previous checkpoints

| Version | Tag / branch | Notes |
|---------|--------------|-------|
| v2 | `backup/ceo-ui-stable-2026-06-21-v2` | HorizontalClock hydration, affirmations API fallback |
| v1 | `backup/ceo-ui-stable-2026-06-21` @ `449f15a` | Foundation runtime stable |

## FinanceOS (separate — do not merge)

| Item | Value |
|------|-------|
| **Branch** | `backup/financeos-2026-06-21` |
| **Release** | https://github.com/RPOSFIN/fbosv4/releases/tag/financeos-backup-2026-06-21 |
| **Local example** | `backups/financeos-2026-06-21/.env.financeos.example` |

FinanceOS uses Supabase project `skqcjguegqouhbgturgs`. FBOS live data uses `eahojgogyrgoelqevbvq`.

## What this FBOS backup includes

- CEO Command Center UI (metrics, sync toolbar, Sales/Ops/Finance cards)
- Supabase + ClickUp + GSheet integration fixes on rollup branch
- GSheet hub sync (leads, operations, finance tabs)
- APIs: command-center, finance matrix, chat, CEO scan, compliance

## Local backup zip

| Location | Purpose |
|----------|---------|
| `backups/fbos-ceo-ui-backup-2026-06-21.zip` | Full FBOS source snapshot (no `node_modules`, no FinanceOS backup folder) |
| Git tag `backup/fbos-ceo-ui-stable-2026-06-21` | Instant restore in repo |
| Git branch `backup/fbos-ceo-ui-stable-2026-06-21` | Same commit, easy checkout |

After clone/unzip: copy `.env.local` from CONFIG or your secure store (not in zip).

### Required `.env.local` keys (FBOS)

```
NEXT_PUBLIC_SUPABASE_URL=https://eahojgogyrgoelqevbvq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from CONFIG-import-ready.csv>
GOOGLE_SHEET_ID=1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI
GOOGLE_WEBAPP_URL=<your Apps Script deploy URL>
GOOGLE_SHEET_GID_LEADS=339902754
GOOGLE_SHEET_GID_OPERATIONS=443214491
GOOGLE_SHEET_GID_FINANCE=1663252170
CLICKUP_API_TOKEN=<valid token>
```

## Restore — if next edits break things

### Option A — backup branch (fast)

```powershell
cd fbosv4
git fetch origin
git checkout backup/fbos-ceo-ui-stable-2026-06-21
npm install
# add .env.local
npm run dev
```

### Option B — from GitHub tag

```powershell
git clone https://github.com/RPOSFIN/fbosv4.git fbos-restore
cd fbos-restore
git checkout backup/fbos-ceo-ui-stable-2026-06-21
npm install
# add .env.local
npm run dev
```

### Option C — from local zip

Unzip `backups/fbos-ceo-ui-backup-2026-06-21.zip` → `npm install` → add `.env.local` → `npm run dev`

## Incremental work rule

1. One small change per step — test on localhost:3000 before next step.
2. Commit after each working step.
3. Tag or branch before risky refactors.
4. Rollback: `git checkout backup/fbos-ceo-ui-stable-2026-06-21`

## Dev server

- URL: **http://localhost:3000**
- Start: `npm run dev`
