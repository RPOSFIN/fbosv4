# Sales OS Architecture

Owner note: Sales will be built before Operation OS.

## Core decision

Sales OS will be one main module with internal submodules, not separate apps for every source.

Supabase is the source of truth. ClickUp, CSV, Google Sheets, IndiaMART, TradeIndia, WhatsApp, Email, website forms, BIS, MCA, FSSAI, GST/TIN/TSIN, references, existing clients, and calling are input, enrichment, communication, or execution channels.

## Internal submodules

- Sales Inbox
- CRM
- Source Connectors
- Enrichment
- Call Coach
- WhatsApp Chat
- Email Timeline
- AI Assistant
- Calculator
- ClickUp Mirror

## Input and enrichment sources

Sources include manual, ClickUp, CSV, Google Sheets, IndiaMART, TradeIndia, WhatsApp, Email, website, sweb, BIS, MCA, FSSAI, GST/TIN/TSIN, references, existing clients, and calling.

Sources are grouped as:

- Intake sources: IndiaMART, TradeIndia, WhatsApp, Email, website, CSV, Google Sheets, manual, ClickUp.
- Enrichment sources: BIS, MCA, FSSAI, GST, TIN, TSIN.
- Relationship sources: references and existing clients.
- Activity sources: calling, WhatsApp replies, email replies.

## Main flow

Input source -> sales_inbox_events -> duplicate check -> enrichment -> lead/client/opportunity -> followup/task/quotation -> communication history -> outcome.

No source should directly overwrite the leads table.

## Proposed tables

- sales_inbox_events
- sales_source_accounts
- sales_lead_matches
- sales_enrichment_records
- sales_communications
- sales_call_logs
- sales_ai_suggestions
- sales_calculations

## Existing tables to reuse

- leads
- lead_history
- followups
- clients
- clickup_tasks
- integrations
- quotations
- tasks

## Lead pipeline

- New
- Duplicate Check
- Qualified
- Contacted
- Followup Scheduled
- Quotation Required
- Quotation Sent
- Negotiation
- Won
- Lost
- Dormant

## CRM and ClickUp decision

CRM lives in Supabase. ClickUp is a task execution mirror, not the master CRM.

Supabase stores lead master, source history, call history, chat and email history, dedupe decisions, AI summaries, quotation context, and owner dashboard data.

ClickUp can mirror selected sales tasks and followups for team execution.

## Call Coach architecture

Call Coach is a Sales submodule.

Flow: dialer event -> call record -> recording reference -> transcript -> AI summary -> lead history -> followup/task.

Call Coach outputs include call outcome, customer intent, objections, next followup date, quotation requirement, lead score, and suggested next script.

## AI Assistant architecture

AI assistant should support OpenAI and local LLM/Ollama style providers.

AI use cases:

- lead classification
- duplicate explanation
- call summary
- WhatsApp/email reply draft
- objection handling
- quotation note generation
- lead scoring
- next best action

AI outputs should store provider, model name, prompt type, result, and acceptance status.

## WhatsApp and Email architecture

WhatsApp and Email stay inside Sales OS as communication channels.

They write to sales_communications, link to lead/client, and may generate followups or tasks.

UI should show lead-wise timeline, reply draft, attachments, pending replies, and followup creation.

## Calculator architecture

Calculator is part of Sales OS and should link to lead/client/quotation.

Calculator types:

- price calculator
- margin calculator
- GST calculator
- freight calculator
- quotation helper
- MOQ or quantity calculator

Results should be saved in sales_calculations and can feed quotation draft.

## Dashboard panels

- New inbox leads
- Duplicate review
- Today followups
- Hot leads
- Quotation required
- Quotation sent
- Dormant leads
- Source performance
- ClickUp sync health
- Call coach pending summaries
- WhatsApp pending replies
- Email pending replies
- Calculator drafts

## Sprint plan

Sprint 1:
- Create sales_inbox_events.
- Create sales_source_accounts.
- Create sales_lead_matches.
- Create sales_enrichment_records.
- Build Sales Inbox UI.
- Add CSV import.
- Add manual lead intake.
- Add duplicate check.

Sprint 2:
- Add sales_communications.
- Add manual WhatsApp and email logging.
- Add followup generation from communication.
- Add ClickUp task mirror for selected followups.

Sprint 3:
- Add sales_call_logs.
- Add Call Coach UI.
- Add recording and transcript fields.
- Add AI call summary and next action.

Sprint 4:
- Add sales_calculations.
- Add pricing, margin, GST, freight calculator.
- Link calculator result to quotation draft.

## Rule

No input source should directly corrupt or overwrite the main leads table. Intake first, review and dedupe second, enrichment third, conversion fourth.
