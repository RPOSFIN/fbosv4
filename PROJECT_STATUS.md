# FBOS V4 — Project Status (Phase 0)

**Governance audit date:** 2026-06-20  
**Mode:** Read-only identification — no code or schema changes made.

---

## Repository Identity

| Field | Value |
|---|---|
| **Git repository name** | `fbosv4` (package name: `fbos-v1`) |
| **GitHub URL** | https://github.com/RPOSFIN/fbosv4 |
| **Owner** | `RPOSFIN` |
| **Visibility** | Private |
| **Default branch** | `main` |
| **Current checkout** | `HEAD detached at a364445` (not on a named branch) |
| **Working tree** | Clean |
| **Latest commit** | `a364445` — *Pre Sprint3 Integrations rewrite* (2026-06-20 03:57:33 +0530) |
| **Remote origin** | `https://github.com/RPOSFIN/fbosv4` (fetch + push) |

---

## Runtime Stack

| Component | Version / Value |
|---|---|
| **Node.js** | v22.14.0 |
| **npm** | 10.9.7 |
| **Next.js** | 16.2.9 |
| **React** | 19.2.4 |
| **TypeScript** | ^5 |
| **Supabase JS** | ^2.108.1 |
| **Supabase SSR** | ^0.12.0 |

---

## Supabase Project

| Field | Value |
|---|---|
| **Project name** | `fbosv4` |
| **Project ID** | `tksfskkivoahggneptqk` |
| **Organization** | `RPOS` (`qlxntzyjfjapstqcedsr`) |
| **Region** | `ap-southeast-2` |
| **Status** | `ACTIVE_HEALTHY` |
| **Database host** | `db.tksfskkivoahggneptqk.supabase.co` |
| **Postgres** | 17.6.1.127 |
| **Public tables** | 22 |
| **Tracked migrations (Supabase)** | 0 (schema applied outside migration history) |

---

## Environment Files

| File | Present in workspace |
|---|---|
| `.env` | No |
| `.env.local` | No |
| `.env.example` | No |
| `.env.production` | No |

`.gitignore` excludes `.env*` and `.env.local`. **No environment template is committed.** Secrets and runtime configuration are not present in this workspace and must be restored from a secure external backup.

---

## Repository Scale (quick snapshot)

| Metric | Count |
|---|---|
| Total tracked files (excl. `.git`, `node_modules`) | ~1,926 |
| App pages (`page.tsx`) | 53 |
| API route handlers (`route.ts`) | 27 |
| Supabase SQL migration files | 9 (+ `schema.sql`) |
| `scripts/google-apps-script/` artifacts | ~350 files (~5.6 MB) |

---

## Phase 0 Verdict

**Identification complete.** The project is a private Next.js 16 application backed by Supabase `fbosv4`, checked out at commit `a364445` in detached-HEAD state. Environment configuration is absent from the workspace. Proceed to Phase 1 audit reports.

**Status:** ✅ Phase 0 complete — awaiting approval before any remediation.
