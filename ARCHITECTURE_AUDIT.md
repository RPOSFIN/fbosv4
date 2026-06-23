# FBOS V4 Architecture Audit

Generated: 2026-06-23  
Scope: Inventory only — pre-stabilization baseline

## Architecture Rule (Target State)

```
Pages → API only
API → Service only
Service → Database only
```

**Leads source of truth:** `Supabase.leads`

**Allowed lead flow:**
```
ClickUp / Google Sheet / Manual Entry
        ↓
     leads
        ↓
  lead-service.ts
        ↓
      API
        ↓
       UI
```

---

## 1. API Routes (36)

| Route | Purpose |
|---|---|
| `/api/auth/session` | Session / mock auth |
| `/api/auth/logout` | Sign out |
| `/api/auth/callback` | OAuth callback |
| `/api/clients` | Clients CRUD |
| `/api/clients/[id]/jobs` | Client jobs |
| `/api/dashboard/command-center` | CEO dashboard metrics |
| `/api/dashboard/kpi` | Sales KPI counts |
| `/api/execution/routes` | Employee route slots |
| `/api/finance/dashboard` | Finance dashboard payload |
| `/api/finance/matrix` | Finance matrix (all panels) |
| `/api/finance/queue` | Finance import queue |
| `/api/followups` | Followups list/create |
| `/api/followups/[id]` | Followup update/delete |
| `/api/followups/today` | Today's followups |
| `/api/health/database` | DB health check |
| `/api/imports/leads` | Bulk lead import |
| `/api/integrations` | Integration hub data |
| `/api/integrations/clickup/sync` | ClickUp sync trigger |
| `/api/integrations/config` | Connector config |
| `/api/integrations/gsheet/sync` | Google Sheet sync |
| `/api/integrations/health` | Connector health |
| `/api/integrations/sync-all` | Sync all connectors |
| `/api/integrations/tally/import` | Tally import |
| `/api/integrations/tally/status` | Tally status |
| `/api/integrations/tally/sync` | Tally sync |
| `/api/integrations/tally/test` | Tally gateway test |
| `/api/jobs` | Jobs list |
| `/api/knowledge/[type]` | Knowledge base |
| `/api/leads` | Leads list/create |
| `/api/leads/[id]` | Lead update/delete |
| `/api/leads/dedupe` | Lead deduplication |
| `/api/leads/stats` | Lead stats / breakdown |
| `/api/observations` | Compliance observations |
| `/api/quotations` | Quotations |
| `/api/webhooks/sheet-sync` | GSheet webhook ingest |
| `/api/webhooks/tally-finance` | Tally finance webhook |

---

## 2. Supabase Tables

| Table | Role |
|---|---|
| `profiles` | User profiles / RBAC |
| `leads` | **Sales source of truth** |
| `clients` | Converted clients |
| `followups` | Follow-up schedule |
| `quotations` | Quotes |
| `jobs` | Operations jobs |
| `products` | Product catalog |
| `orders` | Orders |
| `tasks` | Legacy task store (ClickUp fallback) |
| `call_coach_notes` | Sales call notes |
| `sops` | SOP documents |
| `checklists` | Checklists |
| `route_maps` | Route maps |
| `affirmations` | Affirmations |
| `activity_logs` | Activity audit |
| `audit_logs` | Audit trail |
| `integrations` | Connector status/config |
| `clickup_tasks` | ClickUp staging (not dashboard source) |
| `finance_import_queue` | Tally/GSheet finance rows |
| `sheet_sync_log` | Sheet sync log |
| `lead_history` | Lead change history |
| `fbos_runtime_config` | Runtime secrets hash (RPC auth) |

**RPC functions:** `get_fbos_dashboard_status`, `get_leads_page`, `get_leads_stats`, `ingest_clickup_secret`, `ingest_tally_finance_secret`

---

## 3. ClickUp Integration Files

| File | Role |
|---|---|
| `lib/integrations/clickup.ts` | ClickUp API pull, store tasks, sync to leads |
| `lib/integrations/clickup-leads.ts` | Status mapper, `syncClickUpTasksToLeads` |
| `lib/services/clickup-sync-service.ts` | Service facade: ClickUp → clickup_tasks → leads |
| `app/api/integrations/clickup/sync/route.ts` | Sync API endpoint |
| `supabase/migrations/009_clickup_secret_ingest_rpc.sql` | RPC ingest fallback |

---

## 4. Google Sheet Integration Files

| File | Role |
|---|---|
| `lib/integrations/gsheet.ts` | GSheet sync core |
| `lib/integrations/gsheet-hub.ts` | Hub orchestration |
| `lib/google-write.ts` | Push to GAS webapp |
| `lib/google-config.ts` | GSheet config |
| `app/api/integrations/gsheet/sync/route.ts` | Sync API |
| `app/api/webhooks/sheet-sync/route.ts` | Inbound webhook |
| `components/integrations/gsheet-share-banner.tsx` | UI banner |

---

## 5. Tally Integration Files

| File | Role |
|---|---|
| `lib/integrations/tally.ts` | Tally connector |
| `lib/integrations/tally-finance-ingest.ts` | Finance queue ingest |
| `lib/integrations/tally-config.ts` | Config |
| `lib/integrations/tally-gateway.ts` | Gateway client |
| `lib/integrations/tally-env.ts` | Env helpers |
| `scripts/tally-cloud/TallyToSheet.ps1` | TSPlus sync script |
| `scripts/tally-cloud/Install-TallySync.ps1` | Installer |
| `scripts/tally-cloud/Setup-TallyCloud.ps1` | Setup orchestrator |
| `app/api/integrations/tally/*` | Tally API routes |
| `app/api/webhooks/tally-finance/route.ts` | FBOS webhook fallback |
| `supabase/migrations/007_tally_finance_secret_rpc.sql` | RPC ingest |

---

## 6. Dashboard Pages

| Page | Data API |
|---|---|
| `/` (CEO Master Dashboard) | `/api/dashboard/command-center` |
| `/dashboard` | Re-exports `/` |
| `/sales-dashboard` | `/api/dashboard/kpi` |
| `/sales-workbench` | `/api/leads`, `/api/leads/stats` |
| `/finance-dashboard` | `/api/finance/dashboard`, `/api/finance/matrix` |
| `/executive-dashboard` | Legacy/alternate |
| `/ceo-command-center` | Legacy/alternate |
| `/lead-master` | `/api/leads`, `/api/leads/stats` |
| `/sales-kanban` | `/api/leads` |
| `/leads` | `/api/leads` |

---

## 7. Direct Supabase Queries in Pages

**Scan:** `app/**/*.tsx` for `supabase.from(`

**Result:** None — pages use `apiFetch()` or auth-only Supabase client (login/callback).

Auth-only browser Supabase usage (allowed):
- `app/login/login-form.tsx` — OTP sign-in
- `app/auth/callback/page.tsx` — session exchange

---

## 8. Duplicate Data Flows (Violations Found)

| Issue | Before | Target |
|---|---|---|
| Lead stats vs CEO dashboard | `/api/leads/stats` used anon RLS; command-center used RPC counts | Both via `lead-service.ts` |
| ClickUp on Lead Master panel | Read `clickup_tasks` via `/api/integrations` | Read `leads` where `source=ClickUp` |
| KPI lead count | `get_fbos_dashboard_status.counts.leads` | `lead-service.getLeadStats().total` |
| Scattered lead reads | `lib/leads/fetch.ts` + inline API queries | `lib/services/lead-service.ts` |
| Finance matrix | Inline in route handler | `finance-service.ts` |
| Operations/jobs | Inline in route handler | `operations-service.ts` |

---

## 9. Hardcoded KPIs

| Location | Hardcoded Value | Notes |
|---|---|---|
| `command-center` fallback | `dormantLeads: 0` (fixed) | Now computed in lead-service |
| `finance/matrix` RPC fallback | `healthScore: 0`, trend zeros | Expected when no service-role |
| `lib/integrations/demo-data.ts` | Demo ClickUp/Tally samples | Demo mode only |
| Integration status | Config-based before evidence fix | Now evidence-based |

---

## 10. Mock Data

| Location | Purpose |
|---|---|
| `lib/auth/disabled.ts` | `MOCK_USER`, `MOCK_USER_ID` when auth disabled |
| `lib/auth/config.ts` | `MOCK_SESSION_RESPONSE`, `MOCK_AUTH_CONTEXT` |
| `lib/integrations/demo-data.ts` | `CLICKUP_DEMO`, tally demo payloads |
| `hooks/use-auth.tsx` | Mock session when auth off |

Mock auth is intentional for dev/demo — not used for lead KPI counts.

---

## 11. Service Layer (Post-Sprint)

| Service | Functions |
|---|---|
| `lib/services/lead-service.ts` | `getLeads`, `getLeadStats`, `getWonLeads`, `getActiveLeads`, `getDormantLeads`, `getLeadSalesMetrics` |
| `lib/services/clickup-sync-service.ts` | `runClickUpSync`, re-exports mapper |
| `lib/services/finance-service.ts` | `getFinanceDashboardData`, `getFinanceMatrix` |
| `lib/services/operations-service.ts` | `getJobs`, `getOperationsMetrics` |

---

## 12. Runtime Validation

```bash
npm run runtime:validate
# or
BASE_URL=http://localhost:3001 node scripts/runtime-validation.mjs
```

Validates HTTP 200 + lead count consistency across:
- `/api/leads`
- `/api/leads?limit=50`
- `/api/leads/stats`
- `/api/dashboard/command-center`
- `/api/dashboard/kpi`
- `/api/finance/matrix`

---

## 13. Archived Noise

Report/audit docs moved to `_archive/reports/` (Phase 6).

Application code (`app/`, `lib/`, `supabase/`, `components/`, `scripts/`) was not moved.
