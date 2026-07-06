# FBOS World-Class Architecture Image Prompt

Use this prompt to generate the final FBOS architecture image.

## Prompt

Create a world-class, dark futuristic, AI-agent backend architecture graph for the actual FBOS V1 application. The diagram must be deeply engineered, not generic. It must explain every major head, source, API, memory table, agent, decision gate, input, output, and pending roadmap item.

Visual style:
- Dark black/charcoal dotted-grid canvas.
- Neon grouped containers with dashed rounded borders.
- n8n / LangGraph / AI calling agent orchestration style.
- Rounded nodes with icons.
- Database cylinder icons for Supabase memory tables.
- Glowing arrows with a clear legend.
- Large 16:9 high-resolution image.
- Text must be readable and professionally spaced.
- Make it look like an engineering architecture graph, not a normal business flowchart.

Title:
FBOS V1 — Actual Backend Agent Graph & World-Class Architecture

Subtitle:
Supabase SSOT · Next.js App Router · FinanceOS V2 · Sales & Call Coach · GVT Auto Dialer Planning · Operations Later · ClickUp Connector Mirror

Critical accuracy rules:
- This is FBOS V1, not a generic ERP.
- Do not show HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS, budgeting, generic banking modules, or any unrelated modules.
- ClickUp is not a core OS. ClickUp is only a connector / execution mirror.
- GVT Voice Terminal is not source of truth. GVT is a Sales & Call Coach integration source.
- Supabase is the source of truth.
- FinanceOS must reflect Tally V2 fixes and finance_heads_v2.
- Sales OS is next planned architecture.
- Operation OS is later roadmap.
- No source writes directly into leads.
- No source writes directly into finance_heads_v2.

GROUP 1 — FBOS CURRENT UI MODULES
Left side yellow neon group titled:
1. CURRENT FBOS UI

Nodes:
- CEO Master Dashboard `/`
  Purpose: owner command center; reads command-center API; shows Sales, Operations, Finance cards.
- Sales & Call Coach `/sales-workbench`
  Purpose: current sales screen; shows live leads, call coach text/recording, AI analysis.
- Operations Live `/operations`
  Purpose: current operations screen; reads jobs; shows order status metrics and order master CSV upload.
- Finance Dashboard `/finance-dashboard`
  Purpose: FinanceOS dashboard; v2 matrix heads plus canonical Tally dashboard.
- Execution Hub
- Internal Chat
- Compliance
- Integrations
- Settings

Header connector strip:
- GSheet Connector
- Tally Connector
- ClickUp Connector
- Supabase Status
- Sync All

Add note: Header connectors are integration status and sync controls only, not separate business modules.

GROUP 2 — FINANCEOS V2 CURRENT PIPELINE
Cyan/blue neon group titled:
2. FINANCEOS V2 CURRENT

Input source nodes:
- Tally V2 Vouchers
- Tally V2 Voucher Lines
- Tally V2 Ledgers
- Tally V2 Parties
- Expense Heads V2

Core FinanceOS nodes:
- Tally V2 Clean Source
- Finance Head Builder
- Finance Heads V2 Memory
- V2 Matrix Heads UI
- Canonical Tally Dashboard UI
- Report Filter Options API
- Ledger Balance Lookup
- Owner Finance Snapshot V2
- CEO Master Finance Cards

Main FinanceOS flow:
Tally V2 tables -> clean views/formulas -> finance_heads_v2 -> Finance Dashboard -> CEO Master Finance Cards.
Tally ledgers v2 -> ledger balance lookup -> filter options API -> ledger dropdown with balance.
Expense heads v2 -> operating expense / GST candidates -> finance_heads_v2.

Finance memory tables:
- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- expense_heads_v2
- finance_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Finance current output values:
- Sales: 887 invoices, ₹5.56Cr
- Purchase: 634 rows, ₹4.30Cr
- Receipts: 1358 rows, ₹5.63Cr
- Payments: 2774 rows, ₹5.66Cr
- Receivables: ₹81.61L
- Payables: ₹23.94L
- Bank Cash: -₹6.79L
- Ledger balances shown in dropdown and ledger panel

Finance OK heads:
- sales ok
- purchase ok
- receipts ok
- payments ok
- receivables ok
- payables ok
- bank_cash ok

Finance review heads, show as orange warning nodes:
- Suspense / cash negative pending
- Balance Sheet needs_review
- Ledger needs_review
- GST needs_review
- Operating Expenses needs_review
- Profit & Loss needs_review
- Tally V2 sync rewrite pending
- Legacy table audit pending

Finance hard rules:
- No fake OK.
- Review heads remain needs_review until QC is proven.
- Old Tally sync remains guarded until rewritten to V2.

GROUP 3 — SALES OS NEXT WORLD-CLASS PIPELINE
Magenta/pink neon group titled:
3. SALES OS NEXT

Sales input nodes:
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

Sales core flow nodes:
Input Bus -> Normalize Node -> Sales Inbox Memory -> Duplicate Check Gate -> Lead Match Memory -> Enrichment Node -> Enrichment Memory -> Convert Gate -> CRM Lead / Followup / Client / Quotation.

Show node subtitles:
- Input Bus: all sources enter here
- Normalize Node: clean, map, standardize
- Sales Inbox Memory: sales_inbox_events
- Duplicate Check Gate: company, mobile, email, external IDs
- Lead Match Memory: sales_lead_matches
- Enrichment Node: BIS, MCA, FSSAI, GST, TIN, TSIN
- Enrichment Memory: sales_enrichment_records
- Convert Gate: lead, client, followup, quotation, ignore duplicate

Sales memory tables planned:
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

Existing Sales memory:
- leads
- lead_history
- followups
- clients
- quotations
- tasks
- clickup_tasks
- integrations

Sales specialized agents:
- CRM Agent
  Uses leads, lead_history, followups, clients.
  Output: pipeline status, owner CRM view, followup tasks.
- Call Coach Agent
  Uses call transcript, manual text, recording references.
  Output: AI call summary, objections, next action, followup.
- GVT Auto Dialer Agent
  Uses GVT Today Calls / CSV / API.
  Maps Date, Caller No, Caller Name, Duration, Disposition, Note, Listen.
  Writes sales_call_logs first.
- GVT Voice Broadcast Agent
  Uses selected lead list, custom CSV, voice audio.
  Writes sales_voice_broadcasts and sales_voice_broadcast_recipients.
  Connected/interested numbers create followups.
- WhatsApp Agent
  Uses WhatsApp messages and attachments.
  Writes sales_communications and can create followups or inbox events.
- Email Agent
  Uses email thread, body, attachments.
  Writes sales_communications and can create followups or inbox events.
- AI Assistant Agent
  Provider router: OpenAI + Ollama / local LLM.
  Uses prompt types: lead score, call summary, objection handling, reply draft, quotation notes, next best action.
  Writes sales_ai_suggestions.
- Calculator Agent
  Price, margin, GST, freight, MOQ/quantity, quotation helper.
  Writes sales_calculations and can feed quotations.
- ClickUp Mirror Agent
  Execution mirror only.
  Creates or syncs selected followup/task execution to clickup_tasks.

GVT field mapping mini-table:
- GVT Date -> sales_call_logs.call_datetime
- Mode -> sales_call_logs.mode / direction
- Client ID -> sales_call_logs.client_external_id
- Disposition -> sales_call_logs.disposition / outcome
- Terminal No. -> sales_call_logs.terminal_no
- Caller Name -> sales_call_logs.caller_name
- Caller No. -> sales_call_logs.caller_no
- Duration -> sales_call_logs.duration_seconds
- Flag -> sales_call_logs.flag
- Note -> sales_call_logs.note
- Listen -> sales_call_logs.recording_url / listen_ref
- Full Row -> sales_call_logs.raw

Sales outputs:
- Qualified Lead
- Followup Scheduled
- Quotation Required
- Quotation Draft
- Quotation Sent
- WhatsApp Reply
- Email Reply
- Call Summary
- ClickUp Task
- Won Client
- Lost / Dormant
- Existing Client Opportunity

Sales hard rule:
No source writes directly into leads. Sources go through Sales Inbox, duplicate check, enrichment, and controlled conversion.

GROUP 4 — OPERATIONS CURRENT + OPERATION OS LATER
Orange neon group titled:
4. OPERATIONS CURRENT + LATER

Current Operations nodes:
- Operations Live page
- jobs table
- clients lookup
- Upload Order Master CSV
- Metrics: Total Orders, Dispatched, In Production, Pending

Current operations flow:
jobs -> /api/jobs -> Operations Live page -> order status metrics.

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
Input source -> ops inbox -> entity linking -> task/job/followup/order -> dashboard / alerts -> optional ClickUp mirror.

GROUP 5 — SUPABASE MEMORY SSOT
Green neon group titled:
5. SUPABASE MEMORY SSOT

Show actual existing tables grouped:
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

Planned Sales tables in separate dashed sub-box:
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

Planned Operation tables in separate dashed sub-box:
- ops_inbox_events
- ops_entity_links
- ops_task_rules

GROUP 6 — DASHBOARDS AND OUTPUTS
Purple neon group titled:
6. DASHBOARDS AND OUTPUTS

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
- ClickUp Tasks

Read flow arrows:
- finance_heads_v2 -> CEO Master Dashboard Finance Cards
- finance_heads_v2 -> Finance Dashboard
- leads -> Sales & Call Coach
- jobs -> Operations Live
- sales_call_logs -> Call Coach
- sales_communications -> WhatsApp/Email timelines
- sales_ai_suggestions -> AI recommendations
- sales_calculations -> quotation draft

GROUP 7 — CONNECTORS AND EXTERNAL SYSTEMS
Small connector group titled:
7. CONNECTORS / EXTERNAL SYSTEMS

Nodes:
- GSheet Connector
- Tally Connector
- ClickUp Connector
- Supabase API
- GVT Voice Terminal
- WhatsApp API planned
- Email API planned
- IndiaMART / TradeIndia planned
- OpenAI API
- Ollama / Local LLM

Show arrows from external systems into appropriate agents, not directly into master tables.

GROUP 8 — GOVERNANCE, SECURITY, AND PENDING QC
Red/orange warning group titled:
8. GOVERNANCE / SECURITY / PENDING

Nodes:
- RLS / Security Sprint before production
- Audit Logs
- Activity Logs
- API Auth / RBAC
- Source of Truth rules
- Finance QC review heads
- Legacy cleanup after audit
- Backup / recovery
- Error logs / monitoring

Important warning:
Some Supabase tables currently require a planned RLS/security policy sprint before production. Do not show it as done.

BOTTOM GOLDEN RULE BANNER
Place across full width:
Supabase is SSOT · ClickUp is connector/mirror only · GVT is Sales integration only · Finance reads Tally V2 + finance_heads_v2 · Sales inputs go through inbox first · Review heads stay needs_review until proven · No source writes directly into leads or finance heads.

ARROW LEGEND
- Yellow: input source
- Cyan: current app/API flow
- Green: Supabase memory read/write
- Pink: Sales AI/call/communication agents
- Orange: Operation later and pending items
- Red: QC/security warnings
- Purple: dashboards and outputs

Quality requirements:
- Use icons for database, phone, voice broadcast/speaker, chat, email, upload, ledger, chart, AI brain, connector plug, warning shield.
- Keep each node readable.
- Use fewer but more meaningful arrows.
- Show hierarchy and engineering depth.
- Avoid overcrowding by using grouped containers.
- Make it look like a real system architecture board used by senior engineers.

Negative prompt:
Do not show generic ERP modules, HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS, generic budget modules, fake banking modules, or unrelated tables. Do not show ClickUp as a core operating system. Do not show GVT as source of truth. Do not use a white background. Do not make text tiny or unreadable. Do not create random labels or fake product names. Avoid a simple corporate flowchart look.