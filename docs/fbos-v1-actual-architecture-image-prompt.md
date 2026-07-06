# FBOS V1 Actual Architecture Image Prompt

Use this prompt to generate an architecture image that matches the current FBOS V1 repo and Supabase state. Do not use generic ERP/OS modules.

## Prompt

Create a dark futuristic backend agent graph diagram for the actual FBOS V1 app.

Title:
FBOS V1 Actual Backend Agent Graph

Subtitle:
Supabase SSOT + Next.js App Router + GSheet/Tally/ClickUp Connectors + FinanceOS V2 + Sales & Call Coach + Operations Live

Canvas style:
- Black/dark dotted grid background
- Neon grouped zones with dashed borders
- Rounded workflow nodes connected by arrows
- Look like an AI agent orchestration graph, not a generic ERP chart
- 16:9 wide layout, high resolution

Important accuracy rules:
- Do not invent modules like HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS.
- Show only actual/current FBOS V1 modules and planned Sales OS nodes that we discussed.
- ClickUp is an external connector/execution mirror only, not a core FBOS OS module.
- Supabase is the source of truth.
- No external source writes directly into leads or finance heads.

Zone 1: Current FBOS Pages / UI Modules
Include these nodes:
- CEO Master Dashboard `/`
- Sales & Call Coach `/sales-workbench`
- Operations Live `/operations`
- Finance Dashboard `/finance-dashboard`
- Execution Hub
- Internal Chat
- Compliance
- Integrations
- Settings

Zone 2: Header Sync Connectors
Show small connector chips:
- GSheet Connector
- Tally Connector
- ClickUp Connector (external sync only)
- Supabase Status
- Sync All

Note: These come from the FBOS header sync toolbar and are connectors, not business modules.

Zone 3: FinanceOS V2 Current Flow
Use these input nodes:
- Tally V2 Vouchers
- Tally V2 Voucher Lines
- Tally V2 Ledgers
- Tally V2 Parties
- Expense Heads V2

Core FinanceOS nodes:
- Finance Heads V2
- V2 Matrix Heads
- Canonical Tally Dashboard
- Report Filter Options API
- Ledger Balance Lookup
- Owner Finance Snapshot V2

Finance memory tables:
- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- expense_heads_v2
- finance_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Finance outputs:
- Sales ₹5.56Cr
- Purchase ₹4.30Cr
- Receipts ₹5.63Cr
- Payments ₹5.66Cr
- Receivables ₹81.61L
- Payables ₹23.94L
- Bank Cash -₹6.79L
- Ledger balances
- Finance cards on CEO Master Dashboard

Finance QC pending warning box:
- Suspense / cash negative pending
- Balance Sheet needs_review
- Ledger needs_review
- GST needs_review
- Operating Expenses needs_review
- Profit & Loss needs_review
- V2 sync rewrite pending
- Legacy table audit pending

Zone 4: Sales OS Planned Circuit
Input nodes:
- Manual
- CSV
- Google Sheets
- ClickUp import
- IndiaMART
- TradeIndia
- WhatsApp
- Email
- Website / Sweb
- References
- Existing Clients
- Calling / Auto Dialer
- BIS / MCA / FSSAI
- GST / TIN / TSIN

Core flow:
Input Bus -> Normalize Node -> sales_inbox_events -> Duplicate Check Gate -> sales_lead_matches -> Enrichment Node -> sales_enrichment_records -> Convert Gate -> leads / followups / clients / quotations

Specialized Sales agents:
- CRM Agent
- Call Coach Agent
- WhatsApp Agent
- Email Agent
- AI Assistant Agent (OpenAI + Ollama/local LLM)
- Calculator Agent
- ClickUp Mirror Agent (execution mirror only)

Sales memory tables:
- leads
- lead_history
- followups
- clients
- clickup_tasks
- integrations
- sales_inbox_events (planned)
- sales_source_accounts (planned)
- sales_lead_matches (planned)
- sales_enrichment_records (planned)
- sales_communications (planned)
- sales_call_logs (planned)
- sales_ai_suggestions (planned)
- sales_calculations (planned)

Zone 5: Operations Current + Future
Current nodes:
- Operations Live page
- jobs table
- clients lookup
- Upload Order Master CSV
- Order status metrics: Total Orders, Dispatched, In Production, Pending

Future Operation OS nodes:
- ops_inbox_events
- ops_entity_links
- ops_task_rules
- operations inbox
- task board
- dispatch tracking
- artwork tracking
- sync health

Zone 6: Supabase Actual Tables
Show Supabase as central memory, with actual existing tables grouped:
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
- tally_ledgers_v2
- tally_parties_v2
- tally_vouchers_v2
- tally_voucher_lines_v2
- finance_heads_v2
- expense_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Zone 7: Data rules / Golden Rules
Add a bottom banner:
- Supabase is SSOT.
- ClickUp is connector/execution mirror only.
- Sales input never writes directly to leads.
- Finance dashboard reads FinanceOS V2 heads and Tally V2 tables.
- Review heads stay needs_review until QC is proven.
- Legacy Tally sync remains guarded until rewritten to v2.

Arrow colors:
- Yellow: input source
- Cyan: core app/API flow
- Green: Supabase memory write/read
- Pink: AI/call/communication agents
- Orange: pending/QC warnings
- Purple: outputs and dashboards

Make text readable. Use fewer but accurate nodes. Do not overcrowd. Include icons for database, phone, chat, upload, ledger, chart, and AI brain.

## Negative prompt

Do not show HRMS, InventoryOS, MarketingOS, ProcurementOS, SupportOS, generic bank statement modules, budgets, forecasts, or unrelated ERP modules. Do not show ClickUp as a core OS. Do not show fake tables that are not in the current or planned FBOS architecture. Avoid tiny unreadable text. Avoid white background.
