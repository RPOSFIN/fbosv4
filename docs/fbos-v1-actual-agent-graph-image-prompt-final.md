# FBOS V1 Actual Agent Graph Image Prompt Final

Create a dark futuristic AI-agent backend architecture graph for the actual “FBOS V1” application.

Style:
- Similar to n8n / LangGraph / AI calling agent orchestration diagrams
- Dark charcoal/black dotted grid background
- Neon dashed group containers
- Rounded rectangular nodes
- Glowing arrows
- Clean, readable text
- High-resolution 16:9 layout
- Professional SaaS backend architecture, not a generic ERP chart

Main title:
“FBOS V1 Actual Agent Graph”

Subtitle:
“Current repo reality + FinanceOS V2 fixes + Sales OS next + GVT Auto Dialer planning + Operation OS later”

VERY IMPORTANT ACCURACY RULES:
- Do NOT show generic ERP modules like HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS.
- Do NOT show generic bank statement / budget / forecast modules.
- Do NOT show ClickUp as a core OS module.
- ClickUp must appear only as a connector / execution mirror.
- Do NOT show GVT as a core OS module.
- GVT must appear only as Sales & Call Coach integration source.
- Supabase is the source of truth.
- Show actual FBOS current pages and actual Supabase tables.
- FinanceOS should reflect the Tally V2 work already fixed.
- Sales OS should be shown as planned next.
- Operation OS should be shown as later/future.
- Do not show fake tables unrelated to FBOS.

GROUP 1: FBOS UI / CURRENT PAGES
Left side yellow neon group titled:
“1. FBOS UI”

Nodes:
- CEO Master Dashboard `/`
- Sales & Call Coach `/sales-workbench`
- Operations Live `/operations`
- Finance Dashboard `/finance-dashboard`
- Execution Hub
- Internal Chat
- Compliance
- Integrations
- Settings

Also include a small node:
“Header Sync Toolbar”
Subtitle:
“GSheet · Tally · ClickUp Connector · Supabase · Sync All”

GROUP 2: FINANCEOS V2 CURRENT
Cyan/blue neon group titled:
“2. FinanceOS V2 Current”

Input nodes:
- Tally V2 Vouchers
- Tally V2 Voucher Lines
- Tally V2 Ledgers
- Tally V2 Parties
- Expense Heads V2

Core nodes:
- Finance Heads V2
  subtitle: “12 owner heads”
- V2 Matrix Heads
- Canonical Tally Dashboard
- Filter Options API
  subtitle: “party / ledger / balance”
- Ledger Balance Lookup
- CEO Finance Cards

Flow:
Tally V2 tables → finance_heads_v2 → Finance Dashboard
Tally V2 ledgers → Ledger Balance Lookup → Filter Options API
finance_heads_v2 → CEO Master Dashboard finance cards

Finance visible outputs:
- Sales ₹5.56Cr
- Purchase ₹4.30Cr
- Receipts ₹5.63Cr
- Payments ₹5.66Cr
- Receivables ₹81.61L
- Payables ₹23.94L
- Bank Cash -₹6.79L
- Ledger Balances

GROUP 3: SUPABASE MEMORY / SSOT
Green neon group titled:
“3. Supabase Memory (SSOT)”

Show Supabase database nodes:
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
- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- finance_heads_v2
- expense_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Mark:
“Supabase = Source of Truth”

GROUP 4: CURRENT OUTPUTS / DASHBOARDS
Purple neon group titled:
“4. Current Outputs”

Nodes:
- CEO Master Dashboard Cards
- Finance Dashboard
- Sales & Call Coach
- Operations Live
- Sync Status Chips
- Reports / Tables

Arrows:
Supabase Memory → Current Outputs
FinanceOS V2 → Finance Dashboard
FinanceOS V2 → CEO Master Dashboard Cards
Jobs table → Operations Live
Leads table → Sales & Call Coach

GROUP 5: SALES OS NEXT
Pink/magenta neon group titled:
“5. Sales OS Next”

Show this as next planned build, not fully current.

Input nodes:
- Manual
- CSV
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

Core Sales OS flow:
Input Bus → Normalize Node → Sales Inbox Memory → Duplicate Check Gate → Enrichment Node → Convert Gate

Memory / planned tables:
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

Specialized Sales agents:
- CRM Agent
- Call Coach Agent
  subtitle: “current basic recording + AI analysis”
- GVT Auto Dialer Agent
  subtitle: “Today Calls, call logs, recordings, missed calls, disposition”
- GVT Voice Broadcast Agent
  subtitle: “campaign audio, target list, per-number result”
- WhatsApp Agent
- Email Agent
- AI Assistant Agent
  subtitle: “OpenAI + Ollama / local LLM”
- Calculator Agent
  subtitle: “price, margin, GST, freight”
- ClickUp Mirror Agent
  subtitle: “execution mirror only”

GVT mini mapping node:
- GVT Date → sales_call_logs.call_datetime
- Mode → sales_call_logs.mode / direction
- Client ID → sales_call_logs.client_external_id
- Caller No. → sales_call_logs.caller_no
- Caller Name → sales_call_logs.caller_name
- Duration → sales_call_logs.duration_seconds
- Disposition → sales_call_logs.disposition / outcome
- Note → sales_call_logs.note
- Listen → sales_call_logs.recording_url / listen_ref

GVT Auto Dialer flow:
GVT Today Calls / CSV or API → GVT Auto Dialer Agent → sales_call_logs → lead/client phone match → Sales Call Coach → AI Summary → followup / lead_history

GVT Voice Broadcast flow:
Lead list / custom CSV → GVT Voice Broadcast Agent → sales_voice_broadcasts → sales_voice_broadcast_recipients → connected/interested numbers create followups

Sales outputs:
- Qualified Lead
- Followup Scheduled
- Quotation Draft
- WhatsApp Reply
- Email Reply
- Call Summary
- GVT Call Log
- GVT Broadcast Result
- ClickUp Task
- Won Client
- Lost / Dormant

GROUP 6: OPERATIONS LATER
Orange neon group titled:
“6. Operations Later”

Current nodes:
- Operations Live page
- jobs table
- clients lookup
- Upload Order Master CSV
- Order status metrics:
  Total Orders, Dispatched, In Production, Pending

Future nodes:
- ops_inbox_events
- ops_entity_links
- ops_task_rules
- Operations Inbox
- Task Board
- Dispatch Tracking
- Artwork Tracking
- Sync Health

GROUP 7: PENDING / QC
Red/orange warning group titled:
“7. Pending / QC”

Show warning nodes:
- Suspense / Cash Negative Pending
- Balance Sheet QC needs_review
- Ledger QC needs_review
- GST needs_review
- Operating Expenses needs_review
- Profit & Loss needs_review
- Tally V2 Sync Rewrite Pending
- Legacy Table Audit Pending
- RLS / Security Sprint Before Production

BOTTOM GOLDEN RULE BANNER:
“Supabase is SSOT · ClickUp is connector/mirror only · GVT is Sales integration only · GVT writes to sales_call_logs first · Finance reads Tally V2 + finance_heads_v2 · Sales inputs go through inbox first · Review heads stay needs_review until proven”

Arrow color legend:
- Yellow = UI / input
- Cyan = FinanceOS data flow
- Green = Supabase memory read/write
- Pink = Sales OS / AI / Call / GVT agents
- Orange = Operation OS later
- Red = pending / QC
- Purple = dashboards / outputs

Make it look like a real backend agent graph, with grouped dotted containers, database cylinder icons, connector icons, phone/chat/email/calculator/AI icons, GVT voice terminal icon, voice broadcast speaker icon, and readable arrows. Keep it accurate to FBOS V1.

Negative prompt:
Do not show HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS, generic bank statement / budget / forecast modules, or unrelated ERP modules. Do not show ClickUp as a core OS. Do not show GVT as source of truth. Do not use a white background. Do not make text tiny or unreadable. Avoid random labels. Avoid generic corporate flowchart style.
