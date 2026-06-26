# FBOS V4 — Flexiflair Business OS

`fbos-v1` — a **Next.js 16** business-operations dashboard for Flexiflair: sales/CRM, finance,
operations, an executive CEO Command Center, integrations, and admin/RBAC.

The Google Sheet `01_Dashboard` is the **KPI brain**; the Next.js app is largely a **read-only
display** of data synced (from ClickUp, Tally, Google Sheets) into **Supabase**.

## Quickstart

```bash
git checkout cursor/data-population-0d65   # active branch
npm install
npm run dev                                # http://localhost:3000 (auth disabled — no login)
```

Data-backed pages need a git-ignored `.env.local` with Supabase keys
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Engineering memory (read in order)

This repository **is** the engineering memory — resume from it, not from chat history:

1. [`AI_RULES.md`](AI_RULES.md) — rules every engineer must follow
2. [`docs/00_READ_FIRST.md`](docs/00_READ_FIRST.md) — orientation + map
3. [`docs/01_ENGINEERING_MANIFEST.md`](docs/01_ENGINEERING_MANIFEST.md) — architecture, stack, data flow, commands
4. [`docs/02_PROJECT_STATUS.md`](docs/02_PROJECT_STATUS.md) — sprint, scores, build/runtime status, blockers
5. [`docs/03_HANDOFF.md`](docs/03_HANDOFF.md) — the next task + how to verify

`PROJECT.lock` marks governance as frozen. Historical docs live in `docs/archive/`.

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build + type-check |
| `npm run lint` | ESLint |
| `npm run db:verify` | Verify the 16 Supabase tables |
| `npm run p0:sync:direct` / `p0:counts` | Data-population sync / row counts |
| `npm run validate` | lint + build + db:verify |
