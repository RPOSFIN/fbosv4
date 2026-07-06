# Sales OS Pipeline Mindmap

## One-line architecture

All sources feed Sales Inbox. Sales Inbox dedupes and enriches. Clean records become leads, followups, tasks, quotations, clients, or opportunities.

## Pipeline

Source Inputs
-> Sales Inbox
-> Duplicate Check
-> Enrichment
-> Lead Qualification
-> CRM Stage
-> Communication / Call Coach
-> Calculator / Quotation
-> Followup / Task
-> Won / Lost / Dormant
-> Client / Order handoff

## Mindmap

Sales OS
- Inputs
  - Manual
  - CSV
  - Google Sheets
  - ClickUp
  - IndiaMART
  - TradeIndia
  - Website
  - Sweb
  - WhatsApp
  - Email
  - References
  - Existing clients
  - Calling
- Enrichment
  - BIS
  - MCA
  - FSSAI
  - GST
  - TIN
  - TSIN
- Core Data
  - Sales Inbox
  - Leads
  - Clients
  - Followups
  - Tasks
  - Quotations
  - Communications
  - Call logs
  - AI suggestions
  - Calculations
- Tools
  - CRM
  - ClickUp mirror
  - Auto dialer
  - Call Coach
  - AI Assistant
  - WhatsApp chat
  - Email timeline
  - Calculator
- Outcomes
  - Qualified lead
  - Followup scheduled
  - Quotation required
  - Quotation sent
  - Negotiation
  - Won
  - Lost
  - Dormant
  - Existing client opportunity

## Source classification

Intake sources create Sales Inbox rows.
Enrichment sources verify and improve leads.
Activity sources update communications and followups.
Execution tools mirror selected work outside Supabase.

## Source of truth

Supabase is source of truth. ClickUp is only a mirror for execution.
