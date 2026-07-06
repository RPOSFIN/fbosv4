# Sales OS Architecture

Owner note: Sales will be built before Operation OS.

Sales lead input sources:
- ClickUp
- CSV
- Google Sheets
- IndiaMART
- WhatsApp
- Email
- TradeIndia
- BIS
- MCA
- References
- Existing clients
- Calling
- Website forms
- Manual entry

Core decision:
Supabase is the source of truth. Every source should first enter a Sales Inbox. After review and duplicate check, the record can become a lead, followup, client, task, quotation, or opportunity.

Main flow:
Input source -> sales_inbox_events -> duplicate check -> enrichment -> leads -> followups/tasks -> quotations/orders.

Proposed new tables:
- sales_inbox_events
- sales_source_accounts
- sales_lead_matches
- sales_enrichment_records

Existing tables to reuse:
- leads
- lead_history
- followups
- clients
- clickup_tasks
- integrations

Lead pipeline:
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

Source handling:
ClickUp imports to clickup_tasks and maps to leads or inbox events.
CSV imports should create inbox events first, not overwrite leads directly.
Google Sheets should sync rows into inbox events.
IndiaMART and TradeIndia should create inbox events from API or parsed messages.
WhatsApp and Email should create inbox events and followups.
BIS and MCA should mainly be enrichment and verification sources.
References should create inbox events with source reference.
Existing client enquiries should link to clients and create followup or opportunity, not duplicate leads.
Calling should update followup notes, next followup, call status, and lead stage.

Sales dashboard panels:
- New inbox leads
- Duplicate review
- Today followups
- Hot leads
- Quotation required
- Quotation sent
- Dormant leads
- Source performance
- ClickUp sync health

First sprint:
1. Create sales_inbox_events.
2. Create sales_source_accounts.
3. Create sales_lead_matches.
4. Create sales_enrichment_records.
5. Build Sales Inbox UI.
6. Add CSV import into sales_inbox_events.
7. Add manual lead intake.
8. Add duplicate check against leads by company, mobile, and email.

Rule:
No input source should directly corrupt or overwrite the main leads table. Intake first, review and dedupe second, conversion third.
