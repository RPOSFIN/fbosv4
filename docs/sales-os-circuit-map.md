# Sales OS Circuit Map

Purpose: define who calls whom, where data is fetched from, and which columns are used.

## Circuit 0: Source of truth

Supabase is the master database.

Main existing tables:
- leads
- lead_history
- followups
- clients
- clickup_tasks
- integrations
- quotations
- tasks

New Sales OS tables to add later:
- sales_inbox_events
- sales_source_accounts
- sales_lead_matches
- sales_enrichment_records
- sales_communications
- sales_call_logs
- sales_ai_suggestions
- sales_calculations

## Circuit 1: All lead input sources

External source calls one intake API.

Source -> /api/sales/intake -> sales_inbox_events

Sources:
- manual
- csv
- google_sheets
- clickup
- indiamart
- tradeindia
- whatsapp
- email
- website
- sweb
- reference
- existing_client
- calling

Target table: sales_inbox_events

Core columns:
- id
- source
- source_id
- source_thread_id
- company_name
- contact_person
- mobile
- email
- city
- state
- requirement_text
- product_interest
- message_text
- payload
- status
- priority
- received_at
- created_at

Status values:
- new
- duplicate_review
- enriched
- converted_to_lead
- converted_to_followup
- ignored

## Circuit 2: CSV import

User uploads CSV -> /api/sales/import/csv -> sales_inbox_events

CSV columns to map:
- company_name -> sales_inbox_events.company_name
- contact_person -> sales_inbox_events.contact_person
- mobile -> sales_inbox_events.mobile
- email -> sales_inbox_events.email
- city -> sales_inbox_events.city
- state -> sales_inbox_events.state
- requirement -> sales_inbox_events.requirement_text
- product -> sales_inbox_events.product_interest
- notes -> sales_inbox_events.message_text
- full row -> sales_inbox_events.payload

Do not write CSV directly to leads.

## Circuit 3: Google Sheets

Google Sheet script or sync job -> /api/sales/intake/google-sheets -> sales_inbox_events

Mapping:
- sheet row id -> source_id
- sheet name -> payload.sheet_name
- company -> company_name
- person -> contact_person
- phone -> mobile
- email -> email
- requirement -> requirement_text
- row json -> payload

## Circuit 4: ClickUp CRM/task import

ClickUp API/MCP/sync -> clickup_tasks -> sales_inbox_events or tasks

Current table: clickup_tasks

Existing columns:
- external_id
- name
- status
- team_id
- team_name
- space_id
- space_name
- list_id
- list_name
- raw
- synced_at

Mapping to Sales Inbox:
- clickup_tasks.external_id -> sales_inbox_events.source_id
- clickup_tasks.name -> sales_inbox_events.message_text or requirement_text
- clickup_tasks.raw.customer/company -> company_name
- clickup_tasks.raw.phone -> mobile
- clickup_tasks.raw.email -> email
- clickup_tasks.status -> payload.clickup_status

ClickUp is a mirror, not the CRM master.

## Circuit 5: IndiaMART / TradeIndia

IndiaMART or TradeIndia API/email parser -> /api/sales/intake/marketplace -> sales_inbox_events

Mapping:
- enquiry id -> source_id
- buyer company -> company_name
- buyer name -> contact_person
- mobile -> mobile
- email -> email
- product -> product_interest
- enquiry text -> requirement_text
- full payload -> payload

Source values:
- indiamart
- tradeindia

## Circuit 6: WhatsApp

WhatsApp webhook/import -> /api/sales/communication/whatsapp -> sales_communications
If new enquiry -> also create sales_inbox_events.

sales_communications columns:
- lead_id
- client_id
- source = whatsapp
- direction
- channel = whatsapp
- from_value
- to_value
- message_text
- attachment_urls
- external_thread_id
- external_message_id
- created_at

If no lead match:
- company_name/mobile/message_text copied to sales_inbox_events
- source = whatsapp
- status = new

## Circuit 7: Email

Email parser/import -> /api/sales/communication/email -> sales_communications
If new enquiry -> sales_inbox_events.

Mapping:
- from email -> from_value and email
- to email -> to_value
- subject/body -> message_text
- attachments -> attachment_urls
- thread id -> external_thread_id
- message id -> external_message_id

## Circuit 8: Website / Sweb

Website form -> /api/sales/intake/website -> sales_inbox_events

Mapping:
- form id -> source_id
- name -> contact_person
- company -> company_name
- phone -> mobile
- email -> email
- requirement -> requirement_text
- product -> product_interest
- page url -> payload.page_url
- campaign -> payload.campaign

## Circuit 9: BIS / MCA / FSSAI / GST / TIN / TSIN enrichment

Lead or inbox event -> /api/sales/enrich -> sales_enrichment_records

Input:
- company_name
- gst_no if available
- cin if available
- fssai_no if available
- tin or tsin if available

Target table: sales_enrichment_records

Columns:
- lead_id
- inbox_event_id
- enrichment_source
- data
- confidence
- status
- created_at

Enrichment source values:
- bis
- mca
- fssai
- gst
- tin
- tsin

This improves lead quality but does not create leads directly unless owner imports a list.

## Circuit 10: Duplicate check

sales_inbox_events -> /api/sales/dedupe -> sales_lead_matches

Match against leads by:
- mobile
- email
- company_name normalized
- clickup_task_id

Existing leads columns:
- id
- company_name
- contact_person
- mobile
- email
- status
- source
- assigned_to
- clickup_task_id
- created_at
- updated_at

sales_lead_matches columns:
- inbox_event_id
- lead_id
- client_id
- match_score
- match_reason
- decision
- created_at

Decision values:
- new_lead
- update_existing_lead
- existing_client_opportunity
- duplicate_ignore
- manual_review

## Circuit 11: Convert inbox event to lead

sales_inbox_events + sales_lead_matches -> /api/sales/convert-lead -> leads + lead_history

Write to leads:
- company_name
- contact_person
- mobile
- email
- status
- source
- assigned_to
- created_by
- updated_by
- clickup_task_id if mapped

Write to lead_history:
- lead_id
- changed_fields
- snapshot
- source
- synced_at
- created_at

Default lead status:
- New or Qualified, based on rule.

## Circuit 12: Followup generation

Lead or communication or call outcome -> /api/sales/followups -> followups

Existing followups columns:
- lead_id
- company_name
- contact_person
- next_followup
- status
- notes
- created_by
- updated_by
- created_at
- updated_at

Sources that create followups:
- manual
- call coach
- whatsapp
- email
- quotation sent
- hot lead rule

## Circuit 13: Call Coach

Auto dialer/GVT/manual call -> /api/sales/calls -> sales_call_logs -> lead_history + followups

sales_call_logs columns:
- lead_id
- client_id
- phone_number
- call_provider
- call_id
- direction
- started_at
- duration_seconds
- recording_url
- transcript
- ai_summary
- sentiment
- outcome
- next_followup_at
- created_at

Call Coach calls AI Assistant for:
- transcript summary
- objection extraction
- next action
- lead scoring
- script suggestion

## Circuit 14: AI Assistant

Sales record -> /api/sales/ai/suggest -> provider router -> sales_ai_suggestions

Providers:
- openai
- ollama
- local_llm

sales_ai_suggestions columns:
- lead_id
- source_record_type
- source_record_id
- model_provider
- model_name
- prompt_type
- suggestion
- accepted
- created_at

Prompt types:
- lead_score
- duplicate_reason
- call_summary
- whatsapp_reply
- email_reply
- objection_handling
- quotation_note
- next_best_action

## Circuit 15: Calculator

Lead/client/quotation -> /api/sales/calculator -> sales_calculations -> quotation draft

sales_calculations columns:
- lead_id
- client_id
- calculation_type
- input
- result
- created_by
- created_at

Calculator types:
- price
- margin
- gst
- freight
- quotation
- moq_quantity

## Circuit 16: Quotation

Lead + calculator result -> /api/quotations -> quotations

Existing quotations table should be reused.

Quotation status should feed back to:
- lead_history
- followups
- Sales dashboard

## Circuit 17: Won conversion

Lead status Won -> client/opportunity/order handoff

Flow:
leads -> clients -> orders/jobs later

Existing clients columns:
- client_code
- company_name
- contact_person
- mobile
- email
- gst_no
- address
- credit_limit
- status

## Circuit 18: Dashboard reads

Sales dashboard should fetch:

- /api/sales/inbox-summary from sales_inbox_events
- /api/sales/leads from leads
- /api/sales/followups from followups
- /api/sales/source-health from sales_source_accounts and integrations
- /api/sales/call-coach-summary from sales_call_logs and sales_ai_suggestions
- /api/sales/communications-summary from sales_communications
- /api/sales/calculator-drafts from sales_calculations

## Final rule

No source writes directly into leads except the controlled convert-lead API.
Every source must go through one of:
- sales_inbox_events
- sales_communications
- sales_call_logs
- sales_enrichment_records
- sales_calculations

Then the Sales OS decides the next action.
