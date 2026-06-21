# FinanceOS Backup — 21 Jun 2026

**Important:** FinanceOS and FBOS are **separate projects**. Do not merge Supabase databases.

## What's included

| File / folder | Contents |
|---------------|----------|
| `data.json` | Live row export from all 13 public tables |
| `supabase/007_financeos_rls.sql` | RLS migration (already applied on live project) |
| `code/` | Preview UI files (`/financeos` route) |
| `.env.financeos.example` | Env template for FinanceOS only |

## Live project links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/skqcjguegqouhbgturgs
- **API URL:** https://skqcjguegqouhbgturgs.supabase.co
- **Project ref:** `skqcjguegqouhbgturgs`

## Code / preview links (fbosv4 repo — separate branch)

- **Preview branch:** https://github.com/RPOSFIN/fbosv4/tree/cursor/financeos-preview-65ac
- **PR (not merged to main):** https://github.com/RPOSFIN/fbosv4/pull/15
- **Download branch ZIP:** https://github.com/RPOSFIN/fbosv4/archive/refs/heads/cursor/financeos-preview-65ac.zip

## Run preview locally

```bash
git clone https://github.com/RPOSFIN/fbosv4.git
cd fbosv4
git checkout cursor/financeos-preview-65ac
npm install
# copy .env.financeos.example → .env.local and add anon key from Supabase dashboard
npm run dev
```

Open: http://localhost:3000/financeos

## Restore data (optional)

Import `data.json` rows into a new Supabase project via Table Editor or custom SQL.

## FBOS stays untouched

Keep FBOS on its own Supabase project (`tksfskkivoahggneptqk` / `eahojgogyrgoelqevbvq`).
Use FinanceOS env only when testing `/financeos` preview.
