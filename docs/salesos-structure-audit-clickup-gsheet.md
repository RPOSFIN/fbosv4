# SalesOS Structure Audit: ClickUp + GSheet + Supabase

Scope: audit current SalesOS architecture before implementation. GVT is intentionally parked for now.

## Verdict

The visual SalesOS architecture is directionally correct and can be approved as the high-level structure, with one important adjustment:

- Keep `Sales Inbox` as the future universal intake layer.
- For the immediate sprint, do not build every connector.
- Start with the already-present data sources: ClickUp and Google Sheets.
- Persist AI Coach results before adding more automation.

## Current Data Reality

### Supabase lead sources

| Source | Rows |
|---|---:|
| ClickUp | 2902 |
| Google Sheets | 13 |

### Current ClickUp mirror

| Table | Rows |
|---|---:|
| clickup_tasks | 3243 |

### Current lead status distribution

| Lead status | Rows |
|---|---:|
| NEW | 2905 |
| WON | 5 |
| CONTACTED | 2 |
| QUALIFIED | 2 |
| QUOATED | 1 |

### Current ClickUp status distribution

| ClickUp status | Rows |
|---|---:|
| not interested/required | 1591 |
| back call | 459 |
| backlog | 446 |
| connect in future | 292 |
| not connected | 249 |
| details shared | 157 |
| planning | 33 |
| won | 5 |
| qualified | 2 |
| in progress | 2 |
| new | 2 |
| contacted | 2 |
| negotation | 1 |
| quoated | 1 |
| ready for review | 1 |

## Architecture Approval

### Approved high-level SalesOS flow

```text
External Source
  -> Source Adapter
  -> Sales Inbox
  -> Duplicate Check
  -> Enrichment / Context
  -> Convert Gate
  -> Lead / Followup / Client / Quotation
  -> Optional ClickUp Mirror
```

### Immediate sprint version

```text
ClickUp + Google Sheets + Manual Call Text
  -> Existing leads / clickup_tasks
  -> Sales & Call Coach
  -> AI Coach Analysis
  -> sales_ai_suggestions
  -> Followup action
```

## Why ClickUp first

ClickUp already contains the biggest sales execution dataset:

- 3243 mirrored tasks in `clickup_tasks`.
- 2902 leads with source `ClickUp`.
- Status signals such as back call, not connected, details shared, connect in future, not interested.

This means ClickUp is currently the best practical source for SalesOS execution intelligence.

## Why GSheet second

Google Sheets is already supported, but current Supabase leads show only 13 rows from Google Sheets. So GSheet should be supported as a connector, but it should not drive the first SalesOS sprint.

## What the current repo already has

### Sales & Call Coach

- Page: `/sales-workbench`
- Reads: `/api/leads?limit=50`
- Shows: Total Leads, WON, ACTIVE, LOST
- Supports: live recording and manual text
- Calls: `/api/call-coach/analyze`

### AI Coach

- Route: `/api/call-coach/analyze`
- Current logic: rule-based keyword detection
- Current output: tone, suggestions, crmActions, summary
- Missing: persistence to `sales_ai_suggestions`

### ClickUp sync

- Route: `/api/integrations/clickup/sync`
- Library: `lib/integrations/clickup.ts`
- Writes: `clickup_tasks`
- Maps ClickUp tasks into leads through dedupe

### Google Sheets sync

- Route: `/api/integrations/gsheet/sync`
- Library: `lib/integrations/gsheet.ts`
- Hub library: `lib/integrations/gsheet-hub.ts`
- Imports leads with fields: company_name, contact_person, mobile, email, status, source
- Supports operations and finance hub import paths too

## Required structure changes before implementation

### 1. Separate current from future

In UI and docs, split:

- Current: leads, clickup_tasks, GSheet import, Call Coach
- Sprint now: sales_ai_suggestions, ClickUp status normalization, AI suggestion panel
- Future: sales_inbox_events, sales_source_accounts, enrichment, WhatsApp, Email, IndiaMART, TradeIndia, GVT

### 2. Do not make ClickUp master

ClickUp should remain:

```text
Execution mirror + import source + status signal
```

It should not be:

```text
CRM master
Source of truth
Lead final status authority
```

### 3. Normalize ClickUp statuses

Known statuses need deterministic mapping:

| ClickUp | SalesOS normalized |
|---|---|
| not interested/required | NOT_INTERESTED |
| back call | FOLLOWUP_SCHEDULED |
| backlog | NEW |
| connect in future | FOLLOWUP_SCHEDULED |
| not connected | NOT_CONNECTED |
| details shared | DETAILS_SHARED |
| planning | QUALIFIED |
| won | WON |
| qualified | QUALIFIED |
| contacted | CONTACTED |
| in progress | CONTACTED |
| negotation | NEGOTIATION |
| quoated | QUOATED |
| ready for review | QUALIFIED |

### 4. AI Coach must persist results

Add `sales_ai_suggestions` before making AI Coach bigger.

Reason:

- Current analysis is temporary.
- No audit trail exists.
- No followup action can reliably link to an AI recommendation.

### 5. Followup should be internal first

Flow should be:

```text
AI Suggestion
  -> user accepts
  -> create internal followup
  -> optional ClickUp mirror later
```

Not:

```text
AI Suggestion directly updates lead or ClickUp
```

## Approved first implementation plan

### Phase 1: DB and API

1. Create `sales_ai_suggestions` table.
2. Update `/api/call-coach/analyze` to optionally save analysis.
3. Add normalized ClickUp status helper.
4. Add API for ClickUp mirror summary.

### Phase 2: Sales & Call Coach UI

1. Add AI Suggestions panel.
2. Add ClickUp Mirror summary panel.
3. Add normalized status counts.
4. Add selected lead context.

### Phase 3: Action engine

1. Create followup from AI suggestion.
2. Mark suggestion accepted/rejected.
3. Later: mirror accepted followup to ClickUp.

## Not approved for immediate sprint

Park these until ClickUp + AI Coach foundation is stable:

- GVT Auto Dialer
- GVT Voice Broadcast
- WhatsApp automation
- Email automation
- IndiaMART connector
- TradeIndia connector
- Full Sales Inbox conversion engine

## Final decision

The image architecture is good as a future vision, but implementation should start smaller:

```text
ClickUp mirror audit + AI Coach persistence + followup action engine
```

After that, build Sales Inbox and add more sources one by one.
