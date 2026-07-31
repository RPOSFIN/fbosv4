<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

**What this is:** FBOS ("Flexiflair Business OS") — a single Next.js 16 + React 19 business-ops dashboard (`fbos-v1`). Package manager is **npm** (`package-lock.json`). Node 22 works.

**Run it (dev):** `npm run dev` serves on `http://localhost:3000`. Auth is hard-disabled in code (`lib/auth/disabled.ts` → `isAuthDisabled()` always true; mock user has role `super_admin`), so **no login is needed**. Standard scripts live in `package.json` (`dev`, `lint`, `build`, `db:verify`).

**Data layer needs Supabase.** Pages render without it, but data APIs (e.g. `GET/POST /api/leads`) return HTTP 500 until these are set in a git-ignored `.env.local`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. In production these point at the team's hosted Supabase project (ask the user for them via Secrets if needed).

**Optional fully-local backend (no secrets):** Docker + the Supabase CLI (`supabase start`) gives a local stack. Apply `supabase/migrations/001_phase2_complete.sql` then `002`–`006` via `psql`, point `.env.local` at the `supabase status` URL/keys, and confirm with `npm run db:verify` (checks 16 tables). Because the app runs as the **anon** role with auth disabled (no JWT) and the schema enables RLS + revokes anon, two dev-only DB relaxations are required for read/write to work locally: (1) `grant`/`disable row level security` for `anon`,`authenticated`,`service_role` on `public` tables; (2) relax the `uuid` actor columns (`created_by`,`updated_by`,`user_id`,`assigned_to`) to `text`, because the mock user id `"fbos-demo-user"` is not a UUID and inserts otherwise fail with `invalid input syntax for type uuid`.

**Pre-existing issues (do not "fix" as part of unrelated work):**
- `npm run build` fails type-check at `lib/auth/config.ts` (`MOCK_USER.name` does not exist). Use `npm run dev`, not the production build.
- The Lead Master create form is gated by `useAuth()`, but `AuthProvider` is not wired into the layout, so the **form does not render** in the UI; the write path itself still works via the `POST /api/leads` API.
- `npm run lint` runs but reports pre-existing errors in `scripts/` (CommonJS `require()` helpers).
