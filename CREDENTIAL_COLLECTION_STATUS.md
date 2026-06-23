# FBOS V4 — Credential Collection Status

**Report date:** 2026-06-20  
**Mode:** Read-only status assessment — no code changes, no migrations, no deploy.  
**Sources:** GitHub API, Supabase MCP, codebase inspection, governance audit (`DEPENDENCY_READINESS_CHECKLIST.md`, `BLOCKER_REGISTER.md`).  
**Workspace note:** No `.env` or `.env.local` files present in this environment. Secret values are **not** stored in Git (correct) but are **Missing** from any verified vault accessible to this audit.

---

## Status legend

| Status | Meaning |
|---|---|
| **Available** | Verified and documented (value known or confirmed) |
| **Partial** | Some information exists; secret, owner, or verification incomplete |
| **Missing** | Not available to audit; owner must supply |

---

## GITHUB

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Repository URL | Yes | **Available** | `https://github.com/RPOSFIN/fbosv4` | GitHub → repo home | None | Record in vault runbook |
| Repository Visibility | Yes | **Available** | `Private` | GitHub → Settings → General | Public exposure if changed | Confirm stays Private |
| Default Branch | Yes | **Available** | `main` | GitHub → Settings → Branches | Wrong deploy branch if changed | Protect `main` (future) |
| Primary Owner Account | Yes | **Available** | `RPOSFIN` | GitHub account login | Loss of account = loss of repo | Enable 2FA; document login recovery |
| Secondary Admin Account | Yes | **Missing** | Second GitHub user with **Admin** on `fbosv4` | GitHub → Settings → Collaborators | Single point of failure | Invite backup admin now |
| GitHub PAT (Yes/No) | Yes | **Partial** | Personal Access Token with `repo` scope (stored in vault, not Git) | GitHub → Settings → Developer settings → PAT | Cannot automate deploy/CLI without it | Owner creates PAT; store in password manager |
| Recovery Access Verified (Yes/No) | Yes | **Missing** | Confirmation second admin can clone + push | Recovery drill | Unproven disaster recovery | Second admin clones repo and confirms access |

---

## SUPABASE

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Project Name | Yes | **Available** | `fbosv4` | Supabase Dashboard → Projects | None | Document in runbook |
| Project ID | Yes | **Available** | `tksfskkivoahggneptqk` | Supabase → Project Settings → General | Wrong project if misconfigured | Copy to vault |
| Region | Yes | **Available** | `ap-southeast-2` | Supabase → Project Settings | Latency/compliance | No action |
| NEXT_PUBLIC_SUPABASE_URL | Yes | **Partial** | `https://tksfskkivoahggneptqk.supabase.co` | Supabase → Project Settings → API → Project URL | App cannot connect without it | Owner copies to `.env.local` + Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | **Missing** | JWT anon key (`eyJ…`) | Supabase → Project Settings → API → anon public | Auth and client DB fail | Copy to env; never commit |
| SUPABASE_SERVICE_ROLE_KEY | Yes | **Missing** | Service role JWT (`eyJ…`) | Supabase → Project Settings → API → service_role | Webhooks, admin scripts, GAS sync fail | Copy to vault + Vercel + GAS properties |
| DATABASE_URL | Optional* | **Missing** | Postgres connection string (pooler or direct) | Supabase → Project Settings → Database → Connection string | CLI migrations / pg_dump blocked | Copy `URI` or `Session mode` string to vault |
| Database Password Backup | Yes | **Missing** | Database password (or rotation procedure) | Supabase → Database Settings → Reset password (if needed) | Cannot direct-connect for backup/restore | Save in vault when set |
| Supabase Access Token | Optional | **Missing** | Personal access token for Supabase CLI/Management API | Supabase → Account → Access Tokens | CLI automation blocked | Create if using `supabase` CLI |
| Primary Admin | Yes | **Partial** | Org `RPOS` owner account email | Supabase → Organization → Team | Unknown custodian | Document primary admin email |
| Secondary Admin | Yes | **Missing** | Second org member with Owner/Admin | Supabase → Organization → Invite | Account lockout risk | Invite backup admin |
| Backup Verification Status | Yes | **Missing** | Confirmation PITR/daily backups enabled + test restore | Supabase → Database → Backups | Data loss on failure | Verify plan includes backups; document status |

\*Required for migration scripts; optional for runtime app if using API keys only.

---

## GOOGLE SHEETS

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Master Spreadsheet URL | Yes | **Missing** | Full URL `https://docs.google.com/spreadsheets/d/<ID>/edit` | Google Drive → open master FBOS hub sheet | Cannot locate or share hub | Owner provides URL |
| Spreadsheet ID | Yes | **Missing** | 44-character ID from URL | From spreadsheet URL path | All sheet sync fails | Set `NEXT_PUBLIC_GOOGLE_SHEET_ID` / `GOOGLE_SHEET_ID` |
| Lead CRM Tab Name | Yes | **Partial** | `07_Lead_CRM` (from Apps Script code) | Sheet tab bar / Apps Script `TAB_LEADS` | Wrong tab if renamed | Confirm tab exists with this exact name |
| Lead CRM GID | Yes | **Missing** | Numeric GID from tab URL `gid=` | Open tab → copy `gid` from browser URL | CSV/sync by GID fails | Owner copies GID; fill `getSheetTabGids().leads` |
| Finance Tab Name | Yes | **Partial** | `06_Finance_Sync` (from Apps Script) | Sheet tab bar / `TAB_FINANCE` | Finance sync wrong tab | Confirm tab name |
| Finance GID | Yes | **Missing** | Numeric GID | Tab URL `gid=` parameter | Finance tab import fails | Copy GID to env/code |
| Client Tab Name | Yes | **Partial** | Likely `02_Order_Master` or dedicated clients tab — **not confirmed in env** | Sheet structure / `scripts/sheet-templates/` | Client import misaligned | Owner confirms actual client tab name |
| Client GID | Yes | **Missing** | Numeric GID | Tab URL | Client sync fails | Copy GID |
| Other Tabs | Optional | **Partial** | Known from scripts: `00_Sync_Status`, `01_Dashboard`, `02_Order_Master`, quotations/jobs/followups tabs per templates | Sheet + `scripts/sheet-templates/*.csv` | Partial hub sync | Document full tab list + GIDs |
| Sharing Status | Yes | **Missing** | Who has Editor/Viewer; service account N/A | Google Sheet → Share | Apps Script / export failures | Share with GAS owner + ops editors |
| Owner Account | Yes | **Missing** | Google account email owning the sheet | Google Drive file details | Loss of sheet control | Document owner + backup editor |

---

## GOOGLE APPS SCRIPT

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Script Project ID | Yes | **Missing** | Apps Script project ID (from script URL) | script.google.com → Project → Project settings | Cannot manage/deploy script | Owner copies project ID |
| Deployment URL | Yes | **Partial** | Code default: `https://script.google.com/macros/s/AKfycbyjpnsEUspB5UNosQskuvxWpppeutb1ZBXEXzI0VtjNhBpBObpI9dwSEvigF-VSS66wAw/exec` — **second URL in Tally bridge comments may differ; not verified** | Apps Script → Deploy → Web app | Sync hits wrong deployment | Confirm production URL; set `GOOGLE_WEBAPP_URL` env |
| Google Account Owner | Yes | **Missing** | Email of account that owns/deploys script | Google account used for script.google.com | Cannot redeploy or fix triggers | Document owner |
| Backup Admin | Yes | **Missing** | Second Google account with Editor on script project | Apps Script → Share | Single point of failure | Add backup editor |
| SUPABASE_URL Property | Yes | **Missing** | Same as `NEXT_PUBLIC_SUPABASE_URL` | Set in Apps Script → Project Settings → Script properties | GAS cannot write to Supabase | Set property after Supabase URL collected |
| SUPABASE_SERVICE_KEY Property | Yes | **Missing** | Same as `SUPABASE_SERVICE_ROLE_KEY` | Script properties | GAS Supabase POST fails | Set property (never expose client-side) |
| SPREADSHEET_ID Property | Yes | **Missing** | Same as Google Sheet ID | Script properties | Script cannot find sheet | Set after sheet ID collected |
| SHEET_SYNC_SECRET Property | Yes | **Missing** | Shared secret string (must match Next.js) | Generate + Script properties + Vercel env | Webhook 401; sync broken | Generate secret; sync all three locations |
| FBOS_WEBHOOK_URL Property | Yes | **Missing** | `https://<production-domain>/api/webhooks/sheet-sync` | Known after Vercel + domain | GAS cannot trigger app sync | Set after domain/Vercel deploy |
| Trigger Schedule | Yes | **Partial** | Documented: every **2 hours** (`setupEvery2HourTriggers`); webhook docs mention **4× daily** | Apps Script → Triggers | Stale data if not configured | Owner verifies triggers in GAS console |

---

## CLICKUP

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Workspace Name | Yes | **Missing** | Human-readable workspace name | ClickUp → workspace switcher | Scope confusion | Owner documents name |
| Workspace ID | Optional | **Missing** | Team/workspace ID (often same as Team ID) | ClickUp API or URL | Filtering (optional) | Collect if needed |
| API Token | Yes | **Missing** | Personal API token | ClickUp → Settings → Apps → API Token | Live ClickUp sync impossible | Create token; set `CLICKUP_API_TOKEN` |
| Team ID | Optional | **Missing** | Team ID string | ClickUp API `GET /team` or URL | Scope filter (auto-detect if omitted) | Set `CLICKUP_TEAM_ID` if multi-team |
| Space ID | Optional | **Missing** | Space ID | ClickUp → Space → URL/API | Limits sync scope | Set `CLICKUP_SPACE_ID` |
| Folder ID | Optional | **Missing** | Folder ID | ClickUp hierarchy | Limits sync scope | Set `CLICKUP_FOLDER_ID` |
| List ID | Optional | **Missing** | List ID for Lead CRM tasks | ClickUp list URL | Sync wrong list | Set `CLICKUP_LIST_ID` |
| Token Owner | Yes | **Missing** | Email of person who created token | ClickUp account | Rotation unclear | Document owner |
| Backup Owner | Yes | **Missing** | Second person with workspace admin | ClickUp → Settings → Members | Token loss blocks sync | Assign backup admin |

**DB note:** Supabase `integrations.clickup` status = `pending` (connector row exists, no live sync).

---

## TALLY

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Tally Version | Optional | **Missing** | e.g. TallyPrime 5.x / ERP 9 | Tally → About | Compatibility unknown | Document on bridge machine |
| Company Name | Yes (live) | **Partial** | Default in code: `Flexiflair Tech Private Limited` / demo `Flexiflair Demo Co` — **production name unconfirmed** | Tally → Company login screen | Wrong company data | Owner confirms exact `TALLY_COMPANY_NAME` |
| Host/IP | Yes (live) | **Partial** | Bridge script uses `http://localhost:9007` — production host unknown | Tally gateway machine IP/hostname | Bridge cannot reach Tally | Set `TALLY_HOST` / `TALLY_SERVER_URL` |
| Port | Yes | **Partial** | `9007` in bridge script; app default `9000` in config | Tally → Gateway configuration | Connection failures | Align port in env (`TALLY_PORT`) |
| Bridge Installed (Yes/No) | Yes (live) | **Missing** | Confirmation `scripts/tally-cloud/` installed on Windows + scheduled task `FBOS_TallyToSheet_2h` | Windows machine running Tally | No automated Tally → Sheet push | Install per `Install-TallySync.ps1` |
| XML API Enabled (Yes/No) | Yes (live) | **Missing** | Tally Gateway / HTTP server enabled on configured port | Tally configuration | Bridge HTTP calls fail | Enable Tally HTTP/XML gateway |
| Demo XML Available (Yes/No) | Optional | **Available** | `TALLY_DEMO_XML` in `lib/integrations/demo-data.ts` | Codebase | Dev/demo only — not production | Use for dev; collect live Tally for prod |

**DB note:** Supabase `integrations.tally` status = `pending`.

---

## DOMAIN & DNS

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Domain Name | Yes | **Missing** | e.g. `flexiflair.com` or subdomain choice | Domain registrar | No branded production URL | Decide and register domain |
| Registrar | Yes | **Missing** | e.g. GoDaddy, Namecheap, Cloudflare Registrar | Purchase receipt / login | Cannot manage DNS | Document registrar login |
| DNS Provider | Yes | **Missing** | Often same as registrar or Cloudflare | DNS dashboard | Cannot point app to Vercel | Set up DNS zone |
| Owner Account | Yes | **Missing** | Login for registrar/DNS | Account owner | DNS hijack risk | Document custodian |
| Backup Admin | Yes | **Missing** | Second person with DNS edit access | Registrar/DNS → users | Lockout risk | Add backup admin |
| Production URL | Yes | **Missing** | e.g. `https://app.yourdomain.com` | After DNS + Vercel | Auth redirects, GAS webhook wrong | Decide URL before Supabase auth config |
| Staging URL | Optional | **Missing** | e.g. `https://staging.yourdomain.com` or Vercel preview URL | Vercel preview | No isolated pre-prod | Optional: configure preview domain |

---

## VERCEL

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Team Name | Yes | **Missing** | Vercel team slug/name | vercel.com → Teams | No hosting | Create/join Vercel team |
| Project Name | Yes | **Missing** | e.g. `fbosv4` linked to GitHub repo | Vercel → New Project | No production deploy | Create project from `RPOSFIN/fbosv4` |
| Owner Account | Yes | **Missing** | Vercel account email (Owner) | Vercel login | Deploy lockout | Document owner |
| Backup Admin | Yes | **Missing** | Second team member (Owner/Member) | Vercel → Team Settings | Single point of failure | Invite backup |
| GitHub Connected | Yes | **Missing** | Git integration authorized for `fbosv4` | Vercel → Project → Git | No auto-deploy | Connect GitHub repo |
| Environment Variables Imported | Yes | **Missing** | All Supabase, GAS, ClickUp, Tally, auth flags in Vercel env | Vercel → Settings → Environment Variables | Deployed app nonfunctional | Import after secrets collected |
| Production Environment Ready | Yes | **Missing** | Production branch `main` mapped + successful deploy | Vercel deploy dashboard | No live app | Deploy after build fixes (separate phase) |

**Note:** No `vercel.json` in repository. SSL is automatic via Vercel once domain attached.

---

## EMAIL / SMTP

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Provider | Optional* | **Missing** | Supabase built-in, Gmail SMTP, Resend, SendGrid, etc. | Provider account | User invite/magic link emails fail or spam | Choose provider |
| SMTP Host | Optional* | **Missing** | e.g. `smtp.gmail.com`, `smtp.resend.com` | Provider docs | Email auth broken | Configure in Supabase Auth SMTP |
| SMTP Port | Optional* | **Missing** | e.g. `587`, `465` | Provider docs | Connection failure | Set with host |
| SMTP Username | Optional* | **Missing** | SMTP user or API-style user | Provider dashboard | Auth failure | Store in vault |
| SMTP Password Stored | Optional* | **Missing** | SMTP password or API key | Provider dashboard | Auth failure | Store in vault + Supabase Auth settings |
| SPF Configured | Optional* | **Missing** | TXT record for sending domain | DNS provider | Email deliverability poor | Add SPF when domain chosen |
| DKIM Configured | Optional* | **Missing** | DKIM TXT/CNAME records | Email provider + DNS | Email deliverability poor | Configure after provider choice |

\*Required for production user onboarding if not using Supabase default email limits/custom domain.

---

## WHATSAPP

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| Meta Business Verified | No | **Missing** | Meta Business verification status | business.facebook.com | No WhatsApp API | Defer — not in codebase |
| WABA ID | No | **Missing** | WhatsApp Business Account ID | Meta Business Suite | N/A today | Defer until messaging phase |
| Phone Number ID | No | **Missing** | Graph API Phone Number ID | Meta Developer Console | N/A today | Defer |
| Access Token | No | **Missing** | Permanent or system user token | Meta Developer Console | N/A today | Defer |
| Webhook Verify Token | No | **Missing** | Custom verify string for webhook | App config (not built) | N/A today | Defer |

**Note:** UI mentions WhatsApp (`automation-center`); **no implementation in code**.

---

## AI PROVIDERS

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| OpenAI API Key | No | **Missing** | `sk-…` API key | platform.openai.com | None for MVP | Defer until AI features scoped |
| Anthropic API Key | No | **Missing** | `sk-ant-…` | console.anthropic.com | None for MVP | Defer |
| Other Providers | No | **Missing** | Provider-specific keys | Vendor dashboards | None for MVP | Defer |

**Note:** Pages `ai`, `ai-ceo`, `fbos-intelligence` exist as scaffold only.

---

## BACKUP & RECOVERY

| Item | Required | Current Status | Exact Value Needed | Where Owner Can Obtain It | Blocking Impact | Next Action |
|---|---|---|---|---|---|---|
| ZIP Backup Exists | Yes | **Partial** | Encrypted off-site ZIP of repo (excl. `node_modules`) | Local `zip` / cloud drive | Laptop loss loses uncommitted work | Create scheduled encrypted ZIP per `BACKUP_PLAN.md` |
| Git Checkpoint Exists | Yes | **Partial** | Git tag on known-good commit (e.g. `checkpoint-20260620`) | `git tag` on `main` | No immutable restore point | Owner tags `main` after approval |
| GitHub Backup Verified | Yes | **Partial** | Remote `origin/main` at `a364445`; second admin can clone | Recovery drill | Unproven if only one admin | Second admin clone test |
| Supabase Schema Export Exists | Yes | **Missing** | `pg_dump --schema-only` or `supabase/exports/schema-YYYYMMDD.sql` | Supabase DB connection | Cannot rebuild DB from backup files alone | Export schema to vault/off-site |
| Environment Backup Exists | Yes | **Missing** | Full `.env.local` in encrypted vault | Owner machine password manager | **P0** — prod secrets lost with laptop | Owner backs up all env vars now |
| Offsite Backup Exists | Yes | **Missing** | Encrypted copy outside primary laptop | Cloud vault / USB | Disaster = total secret loss | Set up off-site encrypted backup |
| Recovery Tested | Yes | **Missing** | Documented successful recovery drill | Follow `INSTALLER_RECOVERY_PLAN.md` | Unknown RTO/RPO | Schedule quarterly drill |

---

# FINAL OUTPUT

## 1. Credential Readiness — **17%**

**Method:** 87 production-relevant items scored (Available = 100%, Partial = 50%, Missing = 0%).  
**Available:** 10 items (GitHub metadata, Supabase project metadata, demo XML).  
**Partial:** 14 items (Supabase URL, tab names, deployment URL, Tally defaults, etc.).  
**Missing:** 63 items (all secrets, most owners, Vercel, domain, ClickUp, env backup).

> Production cannot launch until Supabase keys, sheet ID, GAS properties, webhook secret, and auth env flags are collected.

---

## 2. Backup Readiness — **32%**

| Component | Status |
|---|---|
| GitHub remote | Partial — exists, single admin |
| Git tags / checkpoints | Missing |
| ZIP backup | Partial — dry-run only, not off-site |
| Env backup | Missing |
| Schema export | Missing |
| Off-site encrypted backup | Missing |

---

## 3. Recovery Readiness — **26%**

| Component | Status |
|---|---|
| Code clone from GitHub | Available |
| Supabase cloud project | Available |
| Secrets restore | Missing |
| Buildable artifact | Missing (build fails) |
| Documented recovery drill | Missing (plan exists, not tested) |
| One-command installer | Missing |

---

## 4. Ownership Protection — **46%**

| Component | Status |
|---|---|
| Private GitHub repo | Available |
| Single GitHub admin only | Risk |
| Supabase org `RPOS` | Partial — second admin unknown |
| Documented secret custodian | Missing |
| Multi-admin on Google / ClickUp / Vercel | Missing |

---

## 5. Missing Items List (collect now)

### Secrets (never commit — vault only)

1. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `DATABASE_URL` / database password
4. `SHEET_SYNC_SECRET` (generate new if none exists)
5. `CLICKUP_API_TOKEN`
6. Google Sheet ID + all tab GIDs
7. Full `.env.local` backup
8. GitHub PAT (for owner automation)
9. Supabase Access Token (if using CLI)

### Accounts & access

10. GitHub secondary admin (`RPOSFIN` + 1 backup)
11. Supabase org secondary admin
12. Google Sheet owner email + sharing list
13. Google Apps Script owner + script project ID
14. GAS backup editor on script project
15. ClickUp workspace admin + token owner
16. Vercel team + project (not created)
17. Domain registrar / DNS access
18. Tally bridge Windows machine access

### URLs & configuration

19. Master Google Spreadsheet URL
20. Confirmed GAS deployment URL (resolve duplicate URLs in code vs Tally bridge)
21. Production domain / `FBOS_WEBHOOK_URL`
22. Supabase Auth redirect URLs (after domain known)
23. GAS script properties (all five)
24. Vercel environment variables (full set)

### Verification

25. Recovery access drill (GitHub second admin)
26. Supabase backup/PITR confirmation
27. GAS trigger schedule verification
28. Tally XML gateway + bridge installation confirmation

---

## 6. Immediate Blockers (P0)

| ID | Blocker | Why it stops work |
|---|---|---|
| B1 | No `.env.local` / env vault backup | Dev and deploy pause on any machine change |
| B2 | Supabase anon + service role keys not in workspace | App, webhooks, GAS cannot authenticate |
| B3 | `SHEET_SYNC_SECRET` not set/synced | Sheet webhook permanently 401 |
| B4 | Google Sheet ID + GIDs missing | Hub sync cannot target correct tabs |
| B5 | GAS script properties unverified | Scheduled sync never completes pipeline |
| B6 | Single admin on GitHub (no secondary) | Account loss = total code lockout |
| B7 | Vercel project not created | No production hosting path |
| B8 | Production domain undecided | Auth redirects + webhook URL blocked |
| B9 | Build fails (separate code issue — not credential, but blocks deploy) | Even with credentials, cannot ship |

---

## 7. Recommended Next Action

**For the owner (today — no code changes):**

1. **Create encrypted vault entry** titled `FBOS V4 Production Secrets`.
2. **Supabase Dashboard** → API → copy URL, anon key, service_role key → vault.
3. **Supabase Dashboard** → Database → copy connection string + confirm backups enabled.
4. **Google Sheets** → open master hub → copy URL, spreadsheet ID, and `gid=` for tabs: `07_Lead_CRM`, `06_Finance_Sync`, clients/orders tab.
5. **Generate** a strong `SHEET_SYNC_SECRET` → store in vault (same value will go to Vercel + GAS later).
6. **ClickUp** → create API token → vault; note Space/Folder/List IDs from URL.
7. **Google Apps Script** → confirm deployment URL, project ID, triggers; document owner email.
8. **GitHub** → invite **one backup admin** with Admin role.
9. **Supabase org** → invite **one backup admin**.
10. **Decide production domain** and create Vercel team/project (can wait for implementation approval, but domain decision unblocks auth + webhooks).

**Then reply with approval to begin implementation phase** (auth fix, build fix, `.env.example`, Vercel env import — still no migrations until separately approved).

---

## ⛔ STOP — AWAITING APPROVAL

No code modified. No migrations run. No deployment performed.

**Related documents:** `DEPENDENCY_READINESS_CHECKLIST.md`, `BLOCKER_REGISTER.md`, `BACKUP_PLAN.md`, `INSTALLER_RECOVERY_PLAN.md`
