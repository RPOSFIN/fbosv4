# FBOS V1 Master Micro-Detail Agent Graph Prompt

Use this prompt to generate a detailed FBOS V1 architecture image with micro-level mapping.

## Final Prompt

Create a world-class dark futuristic AI-agent backend architecture graph for the actual “FBOS V1” application.

The image must look like a senior engineering architecture board, similar to n8n, LangGraph, AI calling-agent workflow, and SaaS platform backend diagrams.

Style:
- Dark charcoal / black dotted-grid background.
- Neon dashed group containers.
- Rounded rectangular nodes.
- Database cylinder icons for Supabase tables.
- Glowing arrows with labels.
- Clean readable text.
- High-resolution 16:9 layout.
- Professional backend architecture, not a generic ERP chart.
- Use fewer but meaningful arrows; do not overcrowd.
- Use group sections, sub-boxes, numbered flows, badges, and mini mapping tables.

Main title:
“FBOS V1 Actual Agent Graph — Micro Detail Architecture”

Subtitle:
“Current repo reality + FinanceOS V2 fixes + Sales OS next + GVT Auto Dialer planning + Operation OS later + Supabase SSOT”

VERY IMPORTANT ACCURACY RULES:
- Do NOT show HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS.
- Do NOT show generic bank statement, generic budget, or generic forecast modules.
- Do NOT show ClickUp as a core OS module.
- ClickUp must appear only as connector / execution mirror.
- Do NOT show GVT as a core OS module.
- GVT must appear only as a Sales & Call Coach integration source.
- Supabase is the source of truth.
- Show actual FBOS current pages and actual Supabase tables.
- FinanceOS must reflect the Tally V2 work and finance_heads_v2 fixes.
- Sales OS must be shown as next planned build.
- Operation OS must be shown as later/future roadmap.
- No external source writes directly into leads.
- No external source writes directly into finance_heads_v2.
- Review/QC heads must stay warning/needs_review, not green OK.

====================================================
GROUP 1: FBOS CURRENT UI / APP SHELL
====================================================

Yellow neon group titled:
“1. FBOS UI / Current Pages”

Show current page nodes:

1. CEO Master Dashboard `/`
   - Input: command-center APIs, finance heads, leads, jobs, activities.
   - Output: owner-level cards, alerts, quick overview.
   - Reads: finance_heads_v2, leads, jobs, followups, activity_logs.

2. Sales & Call Coach `/sales-workbench`
   - Input: leads API, manual call text, live recording/transcript.
   - Output: Total Leads, Won, Active, Lost, AI call analysis, CRM actions.
   - Reads: leads.
   - Planned reads: sales_call_logs, sales_communications, sales_ai_suggestions.

3. Operations Live `/operations`
   - Input: jobs API and Order Master CSV upload.
   - Output: Total Orders, Dispatched, In Production, Pending, order table.
   - Reads: jobs, clients.

4. Finance Dashboard `/finance-dashboard`
   - Input: FinanceOS V2 APIs.
   - Output: V2 Matrix Heads, Canonical Tally Dashboard, filters, ledger balances.
   - Reads: finance_heads_v2, tally_vouchers_v2, tally_ledgers_v2, expense_heads_v2.

5. Execution Hub
   - Purpose: task/followup execution area.

6. Internal Chat
   - Purpose: internal team communication / support area.

7. Compliance
   - Purpose: compliance checks and vendor/client verification.

8. Integrations
   - Purpose: connector settings and sync health.

9. Settings
   - Purpose: configuration, users, preferences.

Small node: “Header Sync Toolbar”
Subtitle:
“GSheet · Tally · ClickUp Connector · Supabase Status · Sync All”

Header connector explanation:
- GSheet connector = sheet sync/import.
- Tally connector = Tally sync/import.
- ClickUp connector = external task mirror/sync only.
- Supabase status = database status.
- Sync All = runs available sync endpoints.

====================================================
GROUP 2: FINANCEOS V2 CURRENT PIPELINE
====================================================

Cyan/blue neon group titled:
“2. FinanceOS V2 Current — Tally Fixed Flow”

Input source nodes:
- Tally V2 Vouchers
- Tally V2 Voucher Lines
- Tally V2 Ledgers
- Tally V2 Parties
- Expense Heads V2

Finance processing nodes:

A. Tally V2 Clean Source
- Input: raw Tally v2 tables.
- Work: normalize voucher date, voucher type, party name, ledger name, amounts.
- Output: stable rows for reports.

B. Finance Head Builder
- Input: clean Tally V2 rows and formulas.
- Work: builds owner-level finance heads.
- Output: finance_heads_v2.

C. Finance Heads V2 Memory
- Table: finance_heads_v2.
- Contains 12 owner heads.
- Drives: Finance Dashboard and CEO Master Dashboard finance cards.

D. V2 Matrix Heads UI
- Input: finance_heads_v2.
- Output: finance head cards with OK / needs_review status.

E. Canonical Tally Dashboard UI
- Input: Tally V2 APIs and filter options.
- Output: report tables, party/ledger filters, ledger balance panel.

F. Report Filter Options API
- Input by report type.
- Reads:
  - expense_heads_v2 for expense report options.
  - tally_parties_v2 for party summary/party withdrawal.
  - tally_vouchers_v2 for sales, purchase, receipt, payment, journal, contra, debit note, credit note.
  - tally_ledgers_v2 for ledger balances.
- Output: party_options, ledger_options, ledger_balances.

G. Ledger Balance Lookup
- Input: selected ledger names.
- Reads: tally_ledgers_v2.
- Output: opening_balance, closing_balance, parent_group, primary_group.

H. Owner Finance Snapshot V2
- Input: finance_heads_v2 and selected summaries.
- Output: owner snapshot and summary cards.

Finance main arrows:
Tally V2 Vouchers + Voucher Lines -> Tally V2 Clean Source -> Finance Head Builder -> finance_heads_v2 -> V2 Matrix Heads UI.
finance_heads_v2 -> CEO Master Dashboard finance cards.
tally_ledgers_v2 -> Ledger Balance Lookup -> Filter Options API -> Canonical Tally Dashboard.
expense_heads_v2 -> GST / Operating Expense candidate heads -> finance_heads_v2.

Finance memory table nodes:
- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- expense_heads_v2
- finance_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Finance visible output cards:
- Sales: 887 invoices, ₹5.56Cr, status OK.
- Purchase: 634 rows, ₹4.30Cr, status OK.
- Receipts: 1358 rows, ₹5.63Cr, status OK.
- Payments: 2774 rows, ₹5.66Cr, status OK.
- Receivables: ₹81.61L, status OK.
- Payables: ₹23.94L, status OK.
- Bank Cash: -₹6.79L, status OK but sign/cash review nearby.
- Ledger balances in dropdown and ledger panel.

Finance warning/QC nodes:
- Suspense / Cash Negative Pending.
- Balance Sheet needs_review.
- Ledger needs_review.
- GST needs_review.
- Operating Expenses needs_review.
- Profit & Loss needs_review.
- Tally V2 sync rewrite pending.
- Legacy table audit pending.

Finance golden rules:
- No fake OK.
- Review heads remain needs_review until QC is proven.
- Old Tally sync remains guarded until rewritten to V2.
- Finance Dashboard reads FinanceOS V2 heads and Tally V2 tables.

====================================================
GROUP 3: SALES OS NEXT — MICRO DETAIL PIPELINE
====================================================

Pink / magenta neon group titled:
“3. Sales OS Next — Input to Revenue Pipeline”

Show this as planned next build, not fully current.

Sales input sources:
- Manual Entry
- CSV Upload
- Google Sheets
- ClickUp Import
- IndiaMART
- TradeIndia
- WhatsApp
- Email
- Website / Sweb
- References
- Existing Clients
- Calling / Auto Dialer
- GVT Voice Terminal
- GVT Voice Broadcast
- BIS / MCA / FSSAI
- GST / TIN / TSIN

Sales master flow:
Input Source -> Source Adapter -> Input Bus -> Normalize Node -> Sales Inbox Memory -> Duplicate Check Gate -> Lead Match Memory -> Enrichment Node -> Enrichment Memory -> Convert Gate -> CRM / Followup / Client / Quotation / Ignore Duplicate.

Micro node details:

A. Source Adapter
- Input: raw lead data from different channels.
- Work: identifies source, account, external id, timestamp.
- Output: normalized payload for Input Bus.

B. Input Bus
- Input: all sources.
- Work: queues all incoming sales events.
- Output: raw event package.

C. Normalize Node
- Input: raw event package.
- Work: cleans company name, person, mobile, email, city, product requirement, message.
- Output: standardized lead/enquiry event.

D. Sales Inbox Memory
- Table: sales_inbox_events.
- Purpose: every external input lands here first.
- Status examples: new, reviewing, duplicate, converted, ignored.
- Output: review queue and duplicate check input.

E. Duplicate Check Gate
- Input: sales_inbox_events.
- Checks: company name, mobile, email, GST, external source id, existing client match.
- Output: duplicate, possible match, or new lead.

F. Lead Match Memory
- Table: sales_lead_matches.
- Stores match scores and linked lead/client/inbox ids.

G. Enrichment Node
- Input: valid or possible lead.
- Enrichment sources: BIS, MCA, FSSAI, GST, TIN, TSIN.
- Output: company identity, compliance, GST info, risk notes.

H. Enrichment Memory
- Table: sales_enrichment_records.
- Stores enrichment source, status, raw data, confidence.

I. Convert Gate
- Input: inbox event + match + enrichment.
- Decisions:
  - create lead
  - update existing lead
  - create client opportunity
  - create followup
  - create quotation draft
  - ignore duplicate
- Output tables: leads, lead_history, followups, clients, quotations.

Sales planned memory tables:
- sales_inbox_events
- sales_source_accounts
- sales_lead_matches
- sales_enrichment_records
- sales_communications
- sales_call_logs
- sales_voice_broadcasts
- sales_voice_broadcast_recipients
- sales_ai_suggestions
- sales_calculations

Existing Sales/CRM memory tables:
- leads
- lead_history
- followups
- clients
- quotations
- tasks
- clickup_tasks
- integrations

====================================================
GROUP 4: SALES SPECIALIZED AGENTS
====================================================

Pink agent cluster titled:
“4. Specialized Sales Agents”

Show each agent as an AI node with input, work, and output labels.

1. CRM Agent
- Input: leads, lead_history, followups, clients.
- Work: pipeline status, owner assignment, followup tracking, lead stage.
- Output: Qualified Lead, Followup Scheduled, Won Client, Lost/Dormant.

2. Call Coach Agent
- Input: manual call text, live transcript, recording reference, sales_call_logs.
- Work: summarize call, identify objection, detect interest level, recommend next action.
- Output: Call Summary, CRM actions, followup suggestion, lead_history note.
- Current status: basic recording + AI analysis already exists in Sales & Call Coach.

3. GVT Auto Dialer Agent
- Input: GVT Today Calls, CSV/XLS export, API if available, local recording reference.
- Work: import call logs, map fields, match lead/client by phone number.
- Writes first: sales_call_logs.
- Output: missed calls, connected calls, dispositions, recordings, call summary queue.

GVT field mapping mini-table:
- Date -> sales_call_logs.call_datetime
- Mode -> sales_call_logs.mode / direction
- Client ID -> sales_call_logs.client_external_id
- Terminal No. -> sales_call_logs.terminal_no
- Caller Name -> sales_call_logs.caller_name
- Caller No. -> sales_call_logs.caller_no
- Duration -> sales_call_logs.duration_seconds
- Disposition -> sales_call_logs.disposition / outcome
- Flag -> sales_call_logs.flag
- Note -> sales_call_logs.note
- Listen -> sales_call_logs.recording_url / listen_ref
- Full row -> sales_call_logs.raw

GVT Auto Dialer flow:
GVT Today Calls / CSV or API -> GVT Auto Dialer Agent -> sales_call_logs -> phone match -> Lead/Client link -> Sales Call Coach -> AI Summary -> followup / lead_history.

4. GVT Voice Broadcast Agent
- Input: selected lead list, custom CSV, voice audio, broadcast schedule.
- Work: create broadcast campaign, send list to GVT, collect per-number result.
- Writes: sales_voice_broadcasts and sales_voice_broadcast_recipients.
- Output: connected, interested, failed, retry, followup required.

GVT Broadcast flow:
Lead list / custom CSV -> GVT Voice Broadcast Agent -> sales_voice_broadcasts -> sales_voice_broadcast_recipients -> connected/interested numbers create followups.

5. WhatsApp Agent
- Input: WhatsApp messages, files, replies.
- Work: link message to lead/client, detect intent, create communication timeline.
- Writes: sales_communications.
- Output: WhatsApp Reply Draft, followup, inbox event if unknown number.

6. Email Agent
- Input: email thread, body, subject, attachments.
- Work: classify enquiry, link to lead/client, timeline creation.
- Writes: sales_communications.
- Output: Email Reply Draft, followup, inbox event if new sender.

7. AI Assistant Agent
- Input: lead data, call transcript, communication timeline, quotation context.
- Provider router: OpenAI + Ollama / local LLM.
- Work: lead score, next best action, objection handling, reply draft, call summary.
- Writes: sales_ai_suggestions.
- Output: recommendation card, draft reply, next action.

8. Calculator Agent
- Input: product, quantity, GSM/material, price, margin, GST, freight.
- Work: price calculation, margin check, GST/freight estimate.
- Writes: sales_calculations.
- Output: quotation helper and quotation draft input.

9. ClickUp Mirror Agent
- Input: selected followup/task from Sales OS.
- Work: create or sync execution task in ClickUp.
- Writes/reads: clickup_tasks.
- Output: ClickUp Task.
- Rule: ClickUp is execution mirror only, not CRM master.

Sales output nodes:
- Qualified Lead
- Followup Scheduled
- Quotation Required
- Quotation Draft
- Quotation Sent
- WhatsApp Reply
- Email Reply
- Call Summary
- GVT Call Log
- GVT Broadcast Result
- ClickUp Task
- Won Client
- Lost / Dormant
- Existing Client Opportunity

Sales golden rule:
No source writes directly into leads. Every external input goes first to Sales Inbox, then duplicate check, enrichment, and controlled conversion.

====================================================
GROUP 5: OPERATIONS CURRENT + OPERATION OS LATER
====================================================

Orange neon group titled:
“5. Operations Current + Operation OS Later”

Current Operations nodes:
- Operations Live page.
- jobs table.
- clients lookup.
- Upload Order Master CSV.
- Metrics: Total Orders, Dispatched, In Production, Pending.

Current flow:
jobs -> /api/jobs -> Operations Live -> order metrics + live order table.
clients -> client lookup -> Operations Live table.
Order Master CSV -> UploadZone -> future import/sync path.

Future Operation OS nodes:
- ops_inbox_events
- ops_entity_links
- ops_task_rules
- operations inbox
- task board
- dispatch tracking
- artwork tracking
- sync health

Future operation flow:
Input source -> ops_inbox_events -> entity linking -> task/job/followup/order -> dashboard/alerts -> optional ClickUp mirror.

Operation OS later rule:
Operation OS must not be built before Sales OS foundation unless explicitly prioritized.

====================================================
GROUP 6: SUPABASE MEMORY SSOT
====================================================

Green neon group titled:
“6. Supabase Memory / Source of Truth”

Show Supabase as central database with grouped table clusters.

Current business tables:
- leads
- lead_history
- followups
- clients
- jobs
- tasks
- orders
- quotations
- clickup_tasks
- integrations
- activity_logs
- audit_logs

Finance tables:
- tally_ledgers_v2
- tally_parties_v2
- tally_vouchers_v2
- tally_voucher_lines_v2
- finance_heads_v2
- expense_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Planned Sales tables:
- sales_inbox_events
- sales_source_accounts
- sales_lead_matches
- sales_enrichment_records
- sales_communications
- sales_call_logs
- sales_voice_broadcasts
- sales_voice_broadcast_recipients
- sales_ai_suggestions
- sales_calculations

Planned Operation tables:
- ops_inbox_events
- ops_entity_links
- ops_task_rules

Mark clearly:
“Supabase = SSOT”

====================================================
GROUP 7: DASHBOARDS / OUTPUTS / READ MODELS
====================================================

Purple neon group titled:
“7. Dashboards and Outputs”

Output nodes:
- CEO Master Dashboard Cards
- Finance Dashboard
- Sales & Call Coach
- Operations Live
- Sync Status Chips
- Reports / Tables
- Followup Tasks
- Quotation Drafts
- Call Summaries
- WhatsApp Replies
- Email Replies
- GVT Broadcast Results
- ClickUp Tasks

Read flow labels:
- finance_heads_v2 -> CEO Master Dashboard Finance Cards.
- finance_heads_v2 -> Finance Dashboard.
- tally_vouchers_v2 / tally_ledgers_v2 -> Canonical Tally Dashboard.
- leads -> Sales & Call Coach.
- jobs -> Operations Live.
- sales_call_logs -> Call Coach.
- sales_communications -> WhatsApp/Email timelines.
- sales_ai_suggestions -> AI recommendations.
- sales_calculations -> quotation draft.
- clickup_tasks -> execution mirror status.

====================================================
GROUP 8: CONNECTORS / EXTERNAL SYSTEMS
====================================================

Small connector group titled:
“8. Connectors / External Systems”

Nodes:
- GSheet Connector
- Tally Connector
- ClickUp Connector
- Supabase API
- GVT Voice Terminal
- WhatsApp API planned
- Email API planned
- IndiaMART planned
- TradeIndia planned
- OpenAI API
- Ollama / Local LLM

Connector rules:
- External systems connect through adapters/agents.
- External systems do not directly update master tables.
- ClickUp syncs only selected tasks/followups.
- GVT writes sales_call_logs first.

====================================================
GROUP 9: GOVERNANCE / SECURITY / PENDING QC
====================================================

Red/orange warning group titled:
“9. Governance / Security / Pending”

Nodes:
- API Auth / RBAC
- Activity Logs
- Audit Logs
- RLS / Security Sprint Before Production
- Finance QC Review Heads
- Legacy Cleanup After Audit
- Backup / Recovery
- Error Logs / Monitoring
- Source of Truth Rules

Warnings:
- Some Supabase tables require RLS/security policy planning before production.
- Finance review heads are not finalized.
- Suspense/cash negative issue remains pending.
- Legacy Tally sync must be rewritten/audited before full cleanup.

====================================================
BOTTOM GOLDEN RULE BANNER
====================================================

Place a full-width banner at bottom:
“Supabase is SSOT · ClickUp is connector/mirror only · GVT is Sales integration only · GVT writes to sales_call_logs first · Finance reads Tally V2 + finance_heads_v2 · Sales inputs go through inbox first · Review heads stay needs_review until proven · No source writes directly into leads or finance heads”

====================================================
ARROW LEGEND
====================================================

Add legend:
- Yellow = UI / input
- Cyan = FinanceOS data flow
- Green = Supabase memory read/write
- Pink = Sales OS / AI / Call / GVT agents
- Orange = Operation OS later
- Red = pending / QC / security
- Purple = dashboards / outputs

Icon requirements:
- Database cylinder for Supabase tables.
- Phone icon for Call Coach and GVT.
- Speaker/broadcast icon for GVT Voice Broadcast.
- Chat icon for WhatsApp.
- Email icon for Email Agent.
- Calculator icon for Calculator Agent.
- AI brain icon for AI Assistant.
- Plug icon for connectors.
- Warning shield icon for QC/security.
- Chart icon for dashboards.
- Ledger/book icon for FinanceOS.

Negative prompt:
Do not show generic ERP modules, HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS, generic budget modules, fake bank modules, or unrelated tables. Do not show ClickUp as a core operating system. Do not show GVT as source of truth. Do not use a white background. Do not make text tiny or unreadable. Do not create random labels or fake product names. Avoid simple corporate flowchart style.
