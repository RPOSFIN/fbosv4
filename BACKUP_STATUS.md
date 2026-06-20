# FBOS V4 — Backup Status

**Date:** 2026-06-20  
**Scope:** Verification of backup items only — missing/unverified entries  
**No code changes. No deploy. No migrations.**

---

## Verification results

| Item | Status | Notes |
|---|---|---|
| ZIP Backup Exists? | **No** (production) | Audit dry-run created local `/tmp/fbos-backup-test.zip` — not an off-site or scheduled backup |
| Git Checkpoint Exists? | **No** | `git tag -l` empty — no checkpoint tags on `main` |
| Supabase Schema Export Exists? | **No** | No `supabase/exports/` directory; no committed schema dump |
| Environment Backup Exists? | **No** | `.env.local` missing; owner vault backup not verified |
| Offsite Backup Exists? | **No** | No confirmed encrypted copy outside primary machine |

---

## What is implicitly covered (not counted as verified backup)

| Asset | Implicit coverage | Verified backup? |
|---|---|---|
| Source code on GitHub `main` | Remote exists | **No** — recovery drill not run |
| Supabase cloud database | Project `fbosv4` live | **No** — PITR/export not confirmed |

---

## Owner actions to flip each item to Yes

| Item | Action |
|---|---|
| ZIP Backup | Create encrypted ZIP (excl. `node_modules`); store off-site weekly |
| Git Checkpoint | `git tag -a checkpoint-YYYYMMDD -m "..."` on `main`; push tag |
| Supabase Schema Export | `pg_dump --schema-only` → encrypted vault + optional `supabase/exports/` |
| Environment Backup | Copy full `.env.local` + all API keys to password manager **today** |
| Offsite Backup | Same vault or encrypted cloud drive; confirm second person can access |

---

## Backup readiness score

**0 / 5 verified** — all items **No** or unconfirmed.

---

## Recommended order

1. Environment backup (fastest; unblocks disaster recovery of secrets)
2. Supabase schema export
3. Git checkpoint tag on `main`
4. Off-site encrypted ZIP
5. Recovery drill (clone + env restore + `npm ci`)

**Status:** Awaiting owner backup actions. No automated backup configured.
