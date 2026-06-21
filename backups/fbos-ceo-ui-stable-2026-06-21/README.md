# FBOS CEO UI Stable Backup — 2026-06-21

Restore point after GSheet sync disconnect fix on the CEO UI rollup branch.

## Git restore

```bash
git fetch origin
git checkout backup/fbos-ceo-ui-stable-2026-06-21
```

## Zip restore

Use sibling file: `../fbos-ceo-ui-backup-2026-06-21.zip`

## Not included

- `.env.local` (secrets — copy from CONFIG-import-ready.csv)
- `node_modules`
- FinanceOS backup (`backups/financeos-2026-06-21/` — separate project)

See repo root `BACKUP-PLAN.md` for full details.
