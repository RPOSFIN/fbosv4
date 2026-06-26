# FBOS Backup Plan — CEO UI Stable (2026-06-21)

## Checkpoint (latest)

| Item | Value |
|------|-------|
| **Commit** | *(after fix commit — see git log)* |
| **Tag** | `backup/ceo-ui-stable-2026-06-21-v2` |
| **Fixes in v2** | HorizontalClock hydration (Next.js "1 Issue" badge), affirmations API 500 → empty fallback |

## Previous checkpoint

| Item | Value |
|------|-------|
| **Commit** | `449f15a` |
| **Tag** | `backup/ceo-ui-stable-2026-06-21` |

## What this backup includes

- New CEO Command Center UI (light theme, sidebar, sync toolbar)
- GSheet hub sync + Supabase live data path
- ClickUp integration code (deferred / demo until token + table)
- APIs: command-center, finance matrix, chat, CEO scan, compliance, etc.

## Local backup

| Location | Purpose |
|----------|---------|
| `../fbos-v1-backup-2026-06-21.zip` | Full source snapshot (no `node_modules`) |
| Git tag `backup/ceo-ui-stable-2026-06-21` | Instant restore point in repo |
| Git branch `backup/ceo-ui-stable-2026-06-21` | Same commit, easy checkout |

After clone/unzip: copy `.env.local` from your secure store (not in zip).

## Restore — if next edits break things

### Option A — same folder (fast)

```powershell
cd "d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"
git fetch origin
git reset --hard 449f15a
# or
git checkout backup/ceo-ui-stable-2026-06-21
npm install
npm run dev
```

### Option B — from GitHub tag

```powershell
git clone https://github.com/RPOSFIN/fbosv4.git fbos-restore
cd fbos-restore
git checkout backup/ceo-ui-stable-2026-06-21
npm install
# add .env.local
npm run dev
```

### Option C — from local zip

Unzip `fbos-v1-backup-2026-06-21.zip` → `npm install` → add `.env.local` → `npm run dev`

## Incremental work rule (avoid “sab ek saath phat gaya”)

1. **One small change per step** — e.g. only theme, only one API, only one page.
2. **Test on localhost:3000** before next step.
3. **Commit after each working step** with clear message.
4. **Never skip backup** — tag or branch before risky refactors.
5. **Rollback command** — `git reset --hard 449f15a` or checkout backup branch.

## Suggested next steps (slow order)

1. Verify sync pills + GSheet sync + dashboard numbers
2. Fix one module only (e.g. chat persistence)
3. Commit → tag `step-02-chat-persist`
4. Next module (e.g. vendor map from sheet)
5. Repeat

## Dev server

- URL: **http://localhost:3000** (not 3001)
- Start: `npm run dev`
- If hung: kill node on port 3000, restart
