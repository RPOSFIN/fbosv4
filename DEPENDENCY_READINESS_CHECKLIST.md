# FBOS V4 — Dependency Readiness Checklist

**Purpose:** Identify every external dependency required to take FBOS V4 to production.  
**Date:** 2026-06-20  
**Mode:** Pre-implementation planning — no code changes.  
**Sources:** Codebase env usage, Supabase MCP audit, governance reports.

---

## How to use this document

For each dependency, confirm **Owner**, collect **Credentials**, verify **Access level**, and mark readiness before implementation begins. Use with `BLOCKER_REGISTER.md` for prioritized gaps.

**Legend**

| Field | Meaning |
|---|---|
| **Required** | Production cannot launch without it (for scoped MVP) |
| **Optional** | Enhances product; can ship later |
| **Mock/bypass** | Whether existing code can run without real credentials (dev only) |

---

## Summary readiness matrix

| Dependency | Required? | In codebase today | Production ready? |
|---|---|---|---|
| GitHub | Required | ✅ | ⚠️ Single-owner risk |
| Supabase | Required | ✅ | ⚠️ Auth bypass in app |
| Vercel | Required* | ❌ Not configured | ❌ |
| ClickUp | Required (MVP integrations) | ✅ Library | ⚠️ Route stubbed |
| Tally | Optional (Phase 1 finance) | ✅ Library + scripts | ⚠️ Pending connector |
| Google Sheets | Required | ✅ | ⚠️ Hardcoded webapp URL |
| Google Apps Script | Required (with Sheets) | ✅ Scripts | ⚠️ Separate deployment |
| Google Drive | Optional | ❌ | N/A |
| Gmail / SMTP | Optional | ❌ | N/A |
| WhatsApp | Optional (future) | ❌ UI only | N/A |
| Twilio | Optional | ❌ | N/A |
| AI providers | Optional (future) | ❌ Scaffold pages | N/A |
| Domain / DNS | Required (public prod) | ❌ | ❌ |
| SSL / TLS | Required (public prod) | ❌ (via host) | ❌ |
| File storage | Optional (now) | ❌ No buckets | N/A |
| Backup storage | Required (ops) | ❌ Not documented | ❌ |

\*Vercel is listed as the assumed host; any equivalent (AWS, Railway, self-hosted) requires the same env + DNS + SSL checklist.

---

## 1. GitHub

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** |
| **Owner** | `RPOSFIN` (account) — assign backup org admin |
| **Credentials needed** | GitHub personal access token (PAT) or SSH key; optional GitHub Actions secrets |
| **Access level needed** | Repo **Admin** on `RPOSFIN/fbosv4`; ability to create branches, tags, releases |
| **Blocking impact if missing** | No source control, no CI/CD, no team recovery if laptop lost |
| **Mock/bypass possible?** | **No** — canonical code lives here |

**Also collect**

- Repository URL: `https://github.com/RPOSFIN/fbosv4`
- Default branch: `main`
- Visibility confirmation: Private
- List of collaborators with Admin access (minimum 2 people)

---

## 2. Supabase

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** |
| **Owner** | Org `RPOS` — project `fbosv4` (`tksfskkivoahggneptqk`) |
| **Credentials needed** | See table below |
| **Access level needed** | Org Owner or Project Admin; SQL Editor; Auth admin; API settings read |
| **Blocking impact if missing** | App cannot authenticate, persist data, or run integrations |
| **Mock/bypass possible?** | **Partial** — app currently mocks auth (`isAuthDisabled()`); DB still needs real project for prod |

### Supabase credentials checklist

| Variable / secret | Required | Where used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client-side auth (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Admin client, webhooks, scripts, RLS bypass |
| `DATABASE_URL` / `DIRECT_URL` / `POSTGRES_URL` | Optional | `apply-pending-migrations.mjs`, direct psql |
| `SUPABASE_ACCESS_TOKEN` | Optional | Supabase CLI / Management API migrations |
| `SUPABASE_DB_URL` | Optional | Script fallback |

**Also collect**

- Project region: `ap-southeast-2`
- Database password (for direct connection / pg_dump)
- Auth redirect URLs for production domain (when known)
- Email templates / SMTP settings if using Supabase Auth emails
- Confirmation: PITR / backups enabled on plan
- Second org admin account

---

## 3. Vercel (or equivalent hosting)

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for public production (unless self-hosting elsewhere) |
| **Owner** | Team/account that will own production deployment |
| **Credentials needed** | Vercel account; GitHub integration; project env vars; optional `VERCEL_TOKEN` for CLI |
| **Access level needed** | Team Owner or Project Admin; env var edit; domain attach |
| **Blocking impact if missing** | No production URL; no managed SSL; no serverless API hosting |
| **Mock/bypass possible?** | **Yes** locally (`npm run dev`) — **No** for real production |

**Env vars to configure on Vercel (mirror `.env.local`)**

- All Supabase keys
- `SHEET_SYNC_SECRET`, `CLICKUP_API_TOKEN`, Tally vars, Google vars
- `NEXT_PUBLIC_AUTH_DISABLED=false` (or unset)
- `FBOS_AUTH_DISABLED=false` (or unset)

**Also collect**

- Vercel team name and billing owner
- Production + preview domain strategy
- Git branch → environment mapping (`main` → Production)

---

## 4. ClickUp

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for ClickUp → Lead CRM sync MVP |
| **Owner** | ClickUp workspace admin (Flexiflair / RPOS — confirm) |
| **Credentials needed** | Personal or OAuth API token; workspace hierarchy IDs |
| **Access level needed** | API token with read (tasks, lists, spaces); write if pushing status back |
| **Blocking impact if missing** | ClickUp sync fails; `clickup_tasks` empty; lead mapping from ClickUp blocked |
| **Mock/bypass possible?** | **Yes** — `CLICKUP_DEMO` / demo data paths exist in code |

### ClickUp credentials checklist

| Variable | Required | Notes |
|---|---|---|
| `CLICKUP_API_TOKEN` | **Yes** (real sync) | Personal API token from ClickUp settings |
| `CLICKUP_TEAM_ID` | Optional | Auto-detects first team if omitted |
| `CLICKUP_SPACE_ID` | Optional | Filters sync scope |
| `CLICKUP_FOLDER_ID` | Optional | Filters sync scope |
| `CLICKUP_LIST_ID` | Optional | Filters sync scope; used in Apps Script props |

**Also collect**

- ClickUp workspace URL
- Target Space / Folder / List names for Lead CRM
- Token owner email (for rotation)
- Approval: token stored in vault + Vercel env

---

## 5. Tally

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** for MVP dashboard; **Required** for finance sync Phase 1 |
| **Owner** | Accounts / IT — machine running Tally + bridge |
| **Credentials needed** | Network host; company name; optional demo XML |
| **Access level needed** | Tally Gateway / ODBC / HTTP on port (default 9000 or 9007); company open in Tally |
| **Blocking impact if missing** | Finance import queue empty; Tally connector stays `pending` |
| **Mock/bypass possible?** | **Yes** — `TALLY_DEMO_XML` and demo queue paths in `lib/integrations/tally.ts` |

### Tally credentials checklist

| Variable | Required | Notes |
|---|---|---|
| `TALLY_HOST` or `TALLY_SERVER_URL` | **Yes** (live) | IP/hostname reachable from bridge |
| `TALLY_PORT` | Optional | Default `9000` in config |
| `TALLY_COMPANY_NAME` | **Yes** (live) | Exact company name in Tally |
| `TALLY_DEMO_XML` | Optional | Demo bypass |

**Also collect**

- Windows machine with Tally installed (for `scripts/tally-cloud/`)
- Scheduled task name / bridge script path
- Firewall rules for Tally port
- Separate Apps Script web app URL used by Tally bridge (if different from main FBOS hub)

---

## 6. Google Sheets

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for sheet-driven lead/finance sync |
| **Owner** | Google account that owns the master spreadsheet |
| **Credentials needed** | Sheet ID; sharing rules; tab GIDs; CSV export access |
| **Access level needed** | Editor on sheet for ops; Viewer minimum for CSV export; service account **not** used — Apps Script acts as broker |
| **Blocking impact if missing** | Lead import, finance tabs, hub sync all fail |
| **Mock/bypass possible?** | **Partial** — CSV URL fallback if sheet public/exportable; full hub needs Apps Script |

### Google Sheets credentials checklist

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` or `GOOGLE_SHEET_ID` | **Yes** | Master hub spreadsheet ID |
| `GOOGLE_SHEETS_ID` | Alt name | Same as above |
| `GSHEET_CSV_URL` | Optional | Direct CSV fallback |
| Tab GIDs (leads, clients, finance, etc.) | **Yes** | Currently empty strings in `getSheetTabGids()` — must be filled |

**Also collect**

- Full spreadsheet URL
- List of tab names + GIDs (`07_Lead_CRM`, `06_Finance_Sync`, etc.)
- Sharing: who has Editor vs Viewer
- Sheet template files from `scripts/sheet-templates/`

---

## 7. Google Apps Script (GAS)

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** (with Google Sheets production sync) |
| **Owner** | Google account that deploys and owns the script project |
| **Credentials needed** | Script project ID; deployed web app URL; script properties |
| **Access level needed** | Apps Script Editor; deploy as Web App (execute as me, accessible as needed) |
| **Blocking impact if missing** | No scheduled sync; no Supabase push from sheets; webhook never fires |
| **Mock/bypass possible?** | **No** for automated sync — manual CSV import only |

### Apps Script script properties (set in GAS, not Next.js)

| Property | Required | Maps from |
|---|---|---|
| `SUPABASE_URL` | **Yes** | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | **Yes** | `SUPABASE_SERVICE_ROLE_KEY` |
| `SPREADSHEET_ID` | **Yes** | `GOOGLE_SHEET_ID` |
| `SYNC_SECRET` / `SHEET_SYNC_SECRET` | **Yes** | Same value as Next.js webhook secret |
| `FBOS_WEBHOOK_URL` | **Yes** | Production URL + `/api/webhooks/sheet-sync` |
| `CLICKUP_API_TOKEN` | Optional | If syncing from script |
| `CLICKUP_LIST_ID` | Optional | Script-side ClickUp |

**Also collect**

- Current deployment URL (code has hardcoded default — confirm production URL)
- Google Cloud project linked to Apps Script (if applicable)
- Trigger schedule (2-hour / 4× daily)
- Google account 2FA and backup admin

---

## 8. Google Drive

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** |
| **Owner** | Same Google org or separate ops account |
| **Credentials needed** | None in codebase today; would need Drive API OAuth or service account if added |
| **Access level needed** | N/A until feature built |
| **Blocking impact if missing** | None for current MVP |
| **Mock/bypass possible?** | **Yes** — not referenced in runtime code |

**Collect now if planned:** folder IDs for document storage, shared drive admin.

---

## 9. Gmail / SMTP

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** for MVP (Supabase Auth can send magic links via built-in or custom SMTP) |
| **Owner** | IT / Google Workspace admin |
| **Credentials needed** | SMTP host, port, user, password **or** Supabase Auth SMTP settings **or** Resend/SendGrid API key (not in repo) |
| **Access level needed** | Send mail as `noreply@yourdomain.com`; SPF/DKIM DNS records |
| **Blocking impact if missing** | User invite / magic link emails may fail or land in spam |
| **Mock/bypass possible?** | **Yes** for dev — auth disabled; **No** for prod user onboarding |

**Collect if using custom domain email**

- SMTP host, port, username, password
- Or Resend / SendGrid / AWS SES API key + verified domain
- Supabase Auth → SMTP settings screenshot/export

---

## 10. WhatsApp

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** — not implemented (`automation-center` UI text only) |
| **Owner** | Meta Business / WhatsApp Business account owner |
| **Credentials needed** | WhatsApp Business API token, Phone Number ID, Business Account ID, webhook verify token |
| **Access level needed** | Meta Business Manager admin; WABA approved |
| **Blocking impact if missing** | None for current codebase |
| **Mock/bypass possible?** | **Yes** — feature absent |

**Collect only if Phase 2+ messaging planned**

- Meta Business verification status
- WABA phone number
- Permanent access token or System User token

---

## 11. Twilio

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** — not referenced in codebase |
| **Owner** | Communications / ops account owner |
| **Credentials needed** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, sender number |
| **Access level needed** | Account admin; SMS/WhatsApp via Twilio if chosen over Meta direct |
| **Blocking impact if missing** | None today |
| **Mock/bypass possible?** | **Yes** — not implemented |

---

## 12. AI providers (OpenAI, Anthropic, etc.)

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** — pages exist (`ai`, `ai-ceo`, `fbos-intelligence`) but no API integration |
| **Owner** | Product / engineering budget owner |
| **Credentials needed** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or equivalent; optional org ID |
| **Access level needed** | API key with usage limits; billing enabled |
| **Blocking impact if missing** | None for current MVP |
| **Mock/bypass possible?** | **Yes** — scaffold UI only |

---

## 13. Domain / DNS

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for public production |
| **Owner** | Domain registrar account owner (e.g. GoDaddy, Cloudflare, Namecheap) |
| **Credentials needed** | Registrar login; DNS zone access |
| **Access level needed** | DNS edit: A/CNAME for app; TXT for verification (Google, Supabase, email) |
| **Blocking impact if missing** | No branded URL; auth redirect mismatch; webhook URLs wrong |
| **Mock/bypass possible?** | **Yes** — Vercel `*.vercel.app` subdomain for staging |

**Collect now**

- Desired production hostname (e.g. `app.flexiflair.com`)
- Registrar login / delegated DNS access
- Staging subdomain if separate

**DNS records needed later**

| Record | Purpose |
|---|---|
| CNAME → Vercel | App hosting |
| TXT | Domain verification (Vercel, Google, email) |
| MX / SPF / DKIM | If custom email |

---

## 14. SSL / TLS

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for public HTTPS production |
| **Owner** | Hosting provider (Vercel auto) or infra team if self-hosted |
| **Credentials needed** | None if using Vercel/managed host; ACME/Let's Encrypt if self-hosted |
| **Access level needed** | Domain validated on host |
| **Blocking impact if missing** | Browser blocks app; Supabase auth cookies insecure; webhooks may fail |
| **Mock/bypass possible?** | **Yes** — localhost HTTP for dev only |

---

## 15. File storage

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** today — no Supabase Storage buckets configured |
| **Owner** | Supabase project admin (if using Supabase Storage) or S3/GCS account owner |
| **Credentials needed** | Supabase bucket policies **or** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / S3 bucket (not in repo) |
| **Access level needed** | Bucket create + RLS policies; signed URL generation |
| **Blocking impact if missing** | No file uploads (quotations PDFs, attachments) — DB-only MVP OK |
| **Mock/bypass possible?** | **Yes** — no storage code paths in production routes |

---

## 16. Backup storage

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** for operational continuity (not app runtime) |
| **Owner** | Founder / ops — separate from dev laptop |
| **Credentials needed** | Encrypted cloud vault login; optional S3/GDrive backup bucket credentials |
| **Access level needed** | Write encrypted backups; read for recovery drills |
| **Blocking impact if missing** | Laptop loss = secrets lost; cannot restore prod env |
| **Mock/bypass possible?** | **No** for disaster recovery |

**Store off-site**

- `.env.local` full copy (encrypted)
- Supabase service role key backup
- ClickUp / Google / Tally credentials
- Weekly ZIP of repo (or rely on GitHub)
- Supabase schema export (`pg_dump --schema-only`)

---

## 17. Additional dependencies (supporting)

### Node.js runtime

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** |
| **Owner** | Engineering |
| **Credentials needed** | None |
| **Access level** | Node **22.x** (audit used v22.14.0); npm 10.x |
| **Blocking impact** | Cannot build or run |
| **Mock/bypass** | **No** |

### npm registry

| Item | Detail |
|---|---|
| **Required / Optional** | **Required** |
| **Owner** | Engineering |
| **Credentials needed** | None (public packages) |
| **Blocking impact** | `npm ci` fails |
| **Mock/bypass** | **No** |

### Google OAuth (Supabase Auth)

| Item | Detail |
|---|---|
| **Required / Optional** | **Optional** — depends on auth method chosen |
| **Owner** | Google Cloud Console project owner |
| **Credentials needed** | OAuth Client ID + Secret configured in Supabase Auth providers |
| **Access level** | Google Cloud project Editor; authorized redirect URIs |
| **Blocking impact** | Google sign-in unavailable |
| **Mock/bypass** | **Yes** — email/password auth via Supabase |

---

## Master credential collection sheet

Use this table when gathering secrets (store in password manager — **never commit**).

| # | Item | Have? | Owner | Stored in vault? |
|---|---|---|---|---|
| 1 | GitHub admin access (2 people) | ☐ | | |
| 2 | `NEXT_PUBLIC_SUPABASE_URL` | ☐ | | |
| 3 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ☐ | | |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | ☐ | | |
| 5 | Supabase DB password / `DATABASE_URL` | ☐ | | |
| 6 | Supabase org second admin | ☐ | | |
| 7 | Vercel team + project access | ☐ | | |
| 8 | `SHEET_SYNC_SECRET` | ☐ | | |
| 9 | Google Sheet ID + tab GIDs | ☐ | | |
| 10 | Google Apps Script deployment URL | ☐ | | |
| 11 | GAS script properties documented | ☐ | | |
| 12 | Google account owner + backup | ☐ | | |
| 13 | `CLICKUP_API_TOKEN` | ☐ | | |
| 14 | ClickUp Space/Folder/List IDs | ☐ | | |
| 15 | `TALLY_HOST` + `TALLY_COMPANY_NAME` | ☐ | | |
| 16 | Tally bridge Windows access | ☐ | | |
| 17 | Production domain + DNS access | ☐ | | |
| 18 | SMTP or email provider credentials | ☐ | | |
| 19 | Encrypted backup location | ☐ | | |
| 20 | Auth flags confirmed OFF for prod | ☐ | | |

---

## Readiness verdict

**Minimum to unblock development (P0 collection):** items 1–6, 8–12, 20.  
**Minimum to unblock production MVP:** all Required rows above + domain + Vercel + SSL via host.  
**Can defer:** WhatsApp, Twilio, AI, Google Drive, file storage, Tally (if using demo mode temporarily).

**Status:** Checklist complete — awaiting credential collection. No code modified.
