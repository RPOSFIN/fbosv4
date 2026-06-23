# FBOS V4 — Ownership & Control Report (Phase 4)

**Governance audit date:** 2026-06-20  
**Mode:** Read-only review — no ownership or access changes made.

---

## Central Question

> **Can the project be fully recovered if the laptop crashes today?**

### Answer: **Partially — not fully**

| Asset | Recoverable without laptop? | Blocker |
|---|---|---|
| Source code | ✅ Yes | GitHub `RPOSFIN/fbosv4` (private) |
| Git history | ✅ Yes | Remote `origin/main` at commit `a364445` |
| Supabase database | ✅ Yes | Cloud project `fbosv4` independent of laptop |
| Environment secrets | ⚠️ Unknown | No `.env` in repo; depends on external vault backup |
| Google Apps Script | ⚠️ Unknown | Hardcoded URL in code; Google account ownership not verified here |
| ClickUp / Tally credentials | ⚠️ Unknown | External service accounts — not in repo |
| Buildable release | ❌ No | Current commit fails `npm run build` |
| One-command recovery | ❌ No | No installer / `.env.example` / recovery script |

**Verdict:** A new machine can restore **code and database structure**, but **cannot reliably restore a working production system** without a separate secrets backup and build fixes.

---

## GitHub Ownership

| Item | Finding |
|---|---|
| Repository | `RPOSFIN/fbosv4` |
| URL | https://github.com/RPOSFIN/fbosv4 |
| Visibility | **Private** |
| Owner account | `RPOSFIN` |
| Default branch | `main` |
| Open PRs | None observed |
| Local state | Detached HEAD at `a364445` (same as `main` tip) |

### Risks

| Risk | Severity | Mitigation (recommended) |
|---|---|---|
| Single-owner account (`RPOSFIN`) | High | Add org members / backup admin with repo admin access |
| No release tags | Medium | Tag production checkpoints |
| Secrets in git history | Low (current scan clean) | Periodic `gitleaks` audit |

### Control checklist

- [ ] Confirm `RPOSFIN` account has 2FA enabled
- [ ] Add at least one backup GitHub admin (org or collaborator)
- [ ] Document who holds PAT/deploy keys
- [ ] Enable branch protection on `main` (future)

---

## Repository Visibility

- **Private** — source not publicly indexed ✅
- Audit artifacts in repo (`ARENA_AUDIT_PACK*.txt`, `audit_dump.txt`) expose internal directory structure and local Windows paths (`D:\ALL IN ONE FBOS FILES\...`) — not secret keys, but operational recon data

---

## Backup Locations (current state)

| Location | Contents | Status |
|---|---|---|
| GitHub `origin/main` | Canonical source | ✅ Active |
| Local laptop | `.env.local`, possibly Tally bridge | ⚠️ Not verified |
| Supabase cloud | Schema + data (3 integration rows) | ✅ Active |
| Encrypted off-site ZIP | Not confirmed | ❌ Not evidenced |
| Password manager / vault | API keys, service role | ⚠️ Assumed — not verified |
| Google Apps Script | Deployment `AKfycby…` | ⚠️ Ownership tied to Google account |

---

## Supabase Ownership

| Item | Value |
|---|---|
| Organization | `RPOS` (`qlxntzyjfjapstqcedsr`) |
| Project | `fbosv4` (`tksfskkivoahggneptqk`) |
| Region | `ap-southeast-2` |
| Status | `ACTIVE_HEALTHY` |
| Other projects in org | `financeos` (separate) |

### Access control recommendations

- [ ] Confirm multiple org owners on Supabase `RPOS`
- [ ] Store `SUPABASE_SERVICE_ROLE_KEY` only in vault (never Git)
- [ ] Verify database backups / PITR enabled on subscription plan
- [ ] Document who can reset database password / API keys
- [ ] Export schema to `supabase/exports/` on each approved migration (future)

### Schema authority gap

- Live DB has 22 tables and 41 RLS policies
- Supabase migration tracker shows **0 applied migrations**
- Risk: schema changes on laptop SQL files may drift from cloud without diff process

---

## Service Accounts & API Ownership

| Service | Integration point | Ownership concern |
|---|---|---|
| **Supabase** | `NEXT_PUBLIC_*`, service role | Org `RPOS` — verify multi-admin |
| **Google Apps Script** | Hardcoded web app URL in `lib/google-config.ts` | Tied to deploying Google account; rotate via redeploy |
| **Google Sheets** | Sheet ID via env | Sheet sharing permissions not auditable from repo |
| **ClickUp** | `CLICKUP_API_TOKEN` env | Personal or workspace token — document owner |
| **Tally** | Local bridge + `TALLY_HOST` | On-prem / cloud gateway — machine-dependent |
| **WhatsApp** | Not implemented | N/A |
| **GitHub Actions / Vercel** | Not detected in repo | No CI/CD config found — deployments may be manual |

---

## Authority Preservation Score

| Domain | Score (0–100) | Notes |
|---|---:|---|
| GitHub source control | 75 | Private repo, single owner risk |
| Supabase data custody | 70 | Cloud-hosted; org access unverified |
| Secrets custody | 35 | No env template; vault existence unverified |
| Integration API custody | 45 | External accounts not documented |
| Recovery without laptop | 40 | Code yes; secrets and build no |
| **Overall ownership protection** | **53 / 100** | |

---

## Critical ownership gaps

1. **No documented secrets custodian** — if laptop lost, API keys may be unrecoverable
2. **No `.env.example`** — new developer cannot know required variables
3. **Single-point Google Apps Script deployment** — URL baked into source
4. **Build broken** — even with code + DB, cannot deploy from backup alone
5. **No CI/CD or tagged releases** — no immutable deployment artifacts

---

## Recommended authority safeguards (approval required — not executed)

1. Create `.env.example` and store live `.env.local` in encrypted vault
2. Add second admin on GitHub and Supabase org
3. Tag `main` with `checkpoint-20260620` after governance approval
4. Export Supabase schema to versioned `supabase/exports/`
5. Document Google / ClickUp / Tally account owners in internal runbook (not in Git)
6. Fix build so tagged commits are deployable

---

## Phase 4 Verdict

**Ownership of code and database is reasonably centralized** in GitHub + Supabase under `RPOS`/`RPOSFIN`, but **full disaster recovery is not assured** without verified secrets backup, multi-admin access, and a passing build.

**Status:** ✅ Phase 4 complete — no changes made. Awaiting approval.
