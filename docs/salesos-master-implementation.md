# SalesOS Master Implementation Guide

Use this guide to execute the SalesOS backlog step by step.

## Method

For every phase:

1. Check `docs/salesos-master-rules.md`.
2. Check `docs/salesos-master-pt.md`.
3. Pull only the backlog items that belong to the current phase.
4. Do not break existing functionality.
5. Commit small, reviewable changes.
6. Report files, APIs, Supabase changes, UI changes, testing checklist, known issues, and next sprint.

## Current Phase Status

P0 has covered:

- `sales_ai_suggestions` table.
- AI Coach saved suggestions.
- AI suggestions API.
- ClickUp status normalization.
- ClickUp summary API.
- Mirror Leads API.
- Supabase CRM lead filters.
- Mirror leads and CRM leads filters on Sales Workbench.
- AI suggestion to followup action.

## Next Phase Focus

- Followup UX polish.
- Followup list visibility.
- Mirror vs Supabase mismatch review.
- ClickUp richer field audit: assignee, due date, priority, custom fields, comments, tags, attachments.
- Supabase data quality: mobile, assigned user, due date, created by, no empty fields.

## Phase Buckets

### Phase 1: AI Coach and Followup Action

AI suggestions, followup popup, followup list, direct action buttons, and core data quality.

### Phase 2: ClickUp Mirror Deep Audit

ClickUp mapping, missing records, record counts, mirror-vs-Supabase review, API validation, and richer ClickUp fields.

### Phase 3: Call Workflow

Recording UI, call queue, call analytics, attempts, talk time, connected / not connected counts, and retry queue.

### Phase 4: WhatsApp and Email Actions

Direct WhatsApp, direct email, templates, smart replies, share actions, and communication timelines.

### Phase 5: Knowledge Base and Quotation Support

GST, location, PIN code, transport cost, delivery days, reference notes, calculator, quotation helper, and quote share flow.

### Phase 6: GVT Later

GVT UI, calling integration, call logs, and queue only after GVT access method is confirmed.

### Phase 7: MCP Status

Single top-header status dot and tooltip for AI/MCP status.

## Standing Rule

When a future request matches a backlog item, implement it under the correct phase without asking the owner to repeat the full prompt.
