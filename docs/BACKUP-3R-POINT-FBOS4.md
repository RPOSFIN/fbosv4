# FBOS4 — 3R Backup Point (Restore / Recovery / Rollback)

> **Keyword:** Say **"3R point"** or **"fbos4 3R"** to any agent (Cursor, Arena, Gemini, ChatGPT) to restore this exact checkpoint.

**Created:** 2026-06-23  
**Project path:** `d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1`  
**GitHub repo:** https://github.com/RPOSFIN/fbosv4.git

---

## Checkpoint IDs

| Type | Name |
|------|------|
| **Git tag** | `3r-fbos4-2026-06-23` |
| **Git branch** | `backup/fbos4-3r-2026-06-23` |
| **Working branch** | `cursor/data-population-0d65` |
| **Local zip** | `d:\all in one fbos files\BACKUPS\fbos4-3R-2026-06-23.zip` |

---

## What this state includes

- Leads API fix: service-role reads via `getAdminClient()` / `lib/leads/stats.ts`
- ClickUp sync chunked upserts (`lib/integrations/clickup.ts`)
- Auth disabled for local dev (`NEXT_PUBLIC_AUTH_DISABLED=true`)
- Apps Script hub, Tally installer, dashboard docs (HANDOFF, ARCHITECTURE, SPRINT-STATUS)
- Dev server verified: `/api/leads/stats` returns live DB counts (not 0)

---

## Restore from GitHub

```powershell
cd "d:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1"
git fetch origin
git checkout backup/fbos4-3r-2026-06-23
# OR exact tag:
git checkout 3r-fbos4-2026-06-23
npm install
# Copy .env.local from secure backup (NOT in git)
npm run dev
```

---

## Restore from local zip

1. Stop dev server
2. Rename current folder to `fbos-v1-old`
3. Extract `BACKUPS\fbos4-3R-2026-06-23.zip` → `fbos-v1`
4. Restore `.env.local` from your secrets backup
5. `npm install` && `npm run dev`

---

## Verify after restore

```powershell
curl -s http://127.0.0.1:3000/api/leads/stats
# Expect: {"data":{"total":<non-zero>, ...}}
```

---

## Notes

- `.env.local` is **never** in git or zip — keep a separate secrets copy
- `node_modules` and `.next` are excluded from zip — run `npm install` after extract
