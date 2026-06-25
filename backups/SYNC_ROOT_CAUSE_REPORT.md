# Sync Root Cause Report

**Date:** 2026-06-20  
**Branch:** `cursor/final-runtime-recovery-0d65`  
**Priority:** P0

---

## Problem

`npm run p0:sync` failed with fetch error when owner ran sync locally.

---

## Root causes identified

| # | Cause | Evidence |
|---|---|---|
| RC-1 | **Wrong localhost port** | Script hardcoded `http://localhost:3000`; Next.js dev often uses 3001/3002 when 3000 is busy |
| RC-2 | **Dev server not running** | Script requires HTTP POST to running Next.js instance |
| RC-3 | **GET vs POST mismatch** | Not the issue — script correctly uses POST; GET on clickup/sync is read-only status |
| RC-4 | **No fallback when HTTP fails** | Script exited with `FAIL: fetch failed` and no recovery path |

---

## Fix applied

### 1. Auto port detection (`scripts/run-p0-closure.mjs`)

Probes ports 3000, 3001, 3002, 3099 via `GET /api/health/database`:

```javascript
async function resolveBaseUrl() {
  if (process.env.FBOS_BASE_URL?.trim()) {
    return process.env.FBOS_BASE_URL.trim().replace(/\/$/, "");
  }
  for (const port of [3000, 3001, 3002, 3099]) {
    const base = `http://127.0.0.1:${port}`;
    const res = await fetch(`${base}/api/health/database`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return base;
  }
  return "http://localhost:3000";
}
```

Override anytime with `FBOS_BASE_URL=https://your-host`.

### 2. Direct in-process sync (`--direct` flag)

New script `scripts/p0-sync-direct.ts` calls integration libraries directly:

```typescript
import { syncClickUp } from "@/lib/integrations/clickup";
import { syncGSheetHub } from "@/lib/integrations/gsheet-hub";
```

No dev server required. Uses `SUPABASE_SERVICE_ROLE_KEY` and connector env vars from `.env.local`.

```bash
npm run p0:sync:direct
# equivalent to: node scripts/run-p0-closure.mjs --direct
```

### 3. Better error messaging

When both HTTP syncs fail:
```
Both syncs failed via HTTP. Retry with:
  npm run p0:sync -- --direct
```

---

## Endpoint reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/integrations/clickup/sync` | POST | Run ClickUp sync |
| `/api/integrations/gsheet/sync` | POST | Run GSheet hub sync |
| `/api/integrations/clickup/sync` | GET | Read cached sync data (no sync) |

p0 script uses **POST only** — correct.

---

## Recommended owner workflow

```bash
# Option A — dev server running (auto-detects port)
npm run dev          # terminal 1
npm run p0:counts    # terminal 2 — before
npm run p0:sync      # terminal 2 — sync
npm run p0:counts    # terminal 2 — after

# Option B — no dev server
npm run p0:sync:direct
npm run p0:counts
```

---

## Result

✅ **FIXED** — Port mismatch resolved; direct sync path added for serverless execution.
