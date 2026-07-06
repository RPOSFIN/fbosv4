# SalesOS Sprint: ClickUp Mirror + AI Coach

Scope: start SalesOS foundation using current FBOS repo state, excluding GVT for now.

## Current Ground Reality

### Current UI

- `/sales-workbench` exists as Sales & Call Coach.
- It reads `/api/leads?limit=50`.
- It shows Total Leads, WON, ACTIVE, LOST.
- It supports live recording / manual text.
- It calls `/api/call-coach/analyze` for current rule-based AI analysis.

### Current AI Coach

- `/api/call-coach/analyze` exists.
- Current logic is rule-based, using transcript keywords.
- Current output includes:
  - tone
  - suggestions
  - crmActions
  - summary

### Current ClickUp

- `/api/integrations/clickup/sync` exists.
- `lib/integrations/clickup.ts` syncs ClickUp tasks into `clickup_tasks`.
- `lib/integrations/clickup-leads.ts` maps ClickUp tasks into leads with dedupe.
- Current `clickup_tasks` count in Supabase: 3243.
- Current leads count in Supabase: 2915.

### Current Lead Status Reality

Current leads are mostly NEW:

| Lead status | Count |
|---|---:|
| NEW | 2905 |
| WON | 5 |
| CONTACTED | 2 |
| QUALIFIED | 2 |
| QUOATED | 1 |

Current ClickUp statuses include:

| ClickUp status | Count |
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

## Core Decision

SalesOS will start with two tracks:

1. ClickUp Mirror hardening.
2. AI Coach persistence and action engine.

GVT Auto Dialer and Voice Broadcast are parked for later and will not block this sprint.

## Golden Rules

- Supabase remains SSOT.
- ClickUp is execution mirror only, not CRM master.
- AI Coach suggestions do not directly mutate leads without an explicit action.
- Every AI suggestion should be stored for audit.
- Sales status mapping must be normalized before dashboard numbers are trusted.
- No new source writes directly to `leads`; future sources go through Sales Inbox.

---

## Sprint Track A: ClickUp Mirror Hardening

### Problem

ClickUp already has useful status information, but lead statuses in Supabase are mostly `NEW`. SalesOS needs a controlled mapping layer so ClickUp execution states help CRM without making ClickUp the master.

### Current Map Issue

Some ClickUp statuses are human phrases:

- `back call`
- `not connected`
- `connect in future`
- `details shared`
- `not interested/required`
- `negotation`
- `quoated`

These should be normalized to Sales pipeline stages.

### Proposed Sales Pipeline Statuses

- NEW
- QUALIFIED
- CONTACTED
- FOLLOWUP_SCHEDULED
- DETAILS_SHARED
- QUOTATION_REQUIRED
- QUOATED
- NEGOTIATION
- WON
- LOST
- DORMANT
- NOT_CONNECTED
- NOT_INTERESTED

### ClickUp to Sales Status Mapping

| ClickUp status | SalesOS status | Meaning |
|---|---|---|
| new | NEW | New lead/task |
| backlog | NEW | Not actively processed yet |
| planning | QUALIFIED | Needs planning/review |
| qualified | QUALIFIED | Qualified lead |
| contacted | CONTACTED | Contact made |
| details shared | DETAILS_SHARED | Info/price/details sent |
| back call | FOLLOWUP_SCHEDULED | Followup required |
| connect in future | FOLLOWUP_SCHEDULED | Future followup |
| not connected | NOT_CONNECTED | Call attempt failed |
| quoated | QUOATED | Quotation sent/spelling retained for compatibility |
| quoted | QUOATED | Normalized to existing spelling |
| negotation | NEGOTIATION | Typo normalized |
| negotiation | NEGOTIATION | Negotiation stage |
| won | WON | Converted |
| not interested/required | NOT_INTERESTED | Not interested / not required |
| ready for review | QUALIFIED | Needs review |
| in progress | CONTACTED | Active work |

### Implementation Tasks

1. Improve `mapClickUpStatusToLead` with full known ClickUp statuses.
2. Add a normalized status helper for SalesOS dashboard.
3. Add a ClickUp Mirror panel inside Sales & Call Coach:
   - Total ClickUp tasks
   - Back call
   - Not connected
   - Details shared
   - Not interested
   - Won
4. Add a ClickUp task table in Sales & Call Coach:
   - Task name
   - ClickUp status
   - normalized sales stage
   - list name
   - synced at
5. Keep ClickUp as read/import/mirror only.

### Acceptance Criteria

- ClickUp statuses are consistently normalized.
- Dashboard shows ClickUp execution state without confusing it as CRM master.
- Lead pipeline counts become meaningful.
- Existing `clickup_tasks` table remains the mirror table.

---

## Sprint Track B: AI Coach Persistence

### Problem

AI Coach currently analyzes transcript and returns suggestions, but the result is not stored as a durable SalesOS record.

### Target

Every call/manual transcript analysis should create an auditable AI suggestion record.

### Proposed Table: `sales_ai_suggestions`

Columns:

- `id uuid primary key`
- `lead_id uuid null`
- `source text not null default 'call_coach'`
- `source_record_type text null`
- `source_record_id text null`
- `model_name text null`
- `prompt_type text not null default 'call_analysis'`
- `input_text text null`
- `input_data jsonb not null default '{}'`
- `tone text null`
- `summary text null`
- `suggestions jsonb not null default '[]'`
- `crm_actions jsonb not null default '[]'`
- `next_action text null`
- `confidence numeric null`
- `accepted_at timestamptz null`
- `accepted_by uuid null`
- `created_at timestamptz not null default now()`

### AI Coach API changes

`POST /api/call-coach/analyze`

Input should accept:

- `transcript`
- `leadId` optional
- `sourceRecordId` optional
- `save` optional, default true

Output should include:

- `suggestionId`
- `tone`
- `summary`
- `suggestions`
- `crmActions`
- `nextAction`

### UI changes in `/sales-workbench`

Add:

- lead selector / selected lead context
- Save analysis result
- Last AI suggestions panel
- Create followup from suggestion button
- Mark suggestion accepted button

### Acceptance Criteria

- Every analyzed transcript can be stored.
- AI suggestions are traceable by lead/source.
- User can later accept/reject or turn into followup.
- No AI action directly modifies lead status without explicit user action.

---

## Sprint Track C: Followup Action Engine

### Purpose

Turn useful AI suggestions and ClickUp statuses into actionable followups.

### Proposed flow

AI Coach suggestion -> user reviews -> create followup -> optional ClickUp task mirror.

### Tasks

1. Inspect current `followups` schema.
2. Create API to create followup from AI suggestion.
3. Link followup to lead/client if available.
4. Optional: mirror selected followup to ClickUp later.

### Acceptance Criteria

- AI suggestion can become a followup.
- Followup does not require direct ClickUp dependency.
- ClickUp mirror can be added after internal followup works.

---

## Sprint Track D: Sales Dashboard Metrics

### Current issue

Current Sales dashboard uses simple WON/LOST/ACTIVE logic. Since most leads are NEW, it does not reflect actual execution state.

### Proposed cards

- Total Leads
- New
- Qualified
- Contacted
- Followup Due
- Details Shared
- Quotation Stage
- Negotiation
- Won
- Lost / Not Interested
- ClickUp Back Call
- ClickUp Not Connected
- AI Suggestions Today

### Acceptance Criteria

- Dashboard cards use normalized statuses.
- ClickUp mirror cards are separated from CRM master cards.
- AI Coach cards show actual stored AI suggestions.

---

## Implementation Order

### Phase 1: Safe foundation

1. Add SalesOS sprint tracker document.
2. Add/confirm `sales_ai_suggestions` table.
3. Improve ClickUp status normalization.
4. Update AI Coach API to save suggestions.

### Phase 2: UI visibility

5. Add AI suggestions panel in Sales & Call Coach.
6. Add ClickUp mirror panel in Sales & Call Coach.
7. Add normalized dashboard metrics.

### Phase 3: Actions

8. Create followup from AI suggestion.
9. Mark AI suggestion accepted/rejected.
10. Optional ClickUp task mirror from followup.

## Out of Scope for This Sprint

- GVT Auto Dialer.
- GVT Voice Broadcast.
- WhatsApp API automation.
- Email API automation.
- IndiaMART / TradeIndia direct connector.
- Full Sales Inbox conversion engine.

## Next Engineering Step

Create a migration for `sales_ai_suggestions`, then update `/api/call-coach/analyze` to persist AI analysis results.
