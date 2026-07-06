const uiNodes = [
  ["CEO Master", "/"],
  ["Sales & Call Coach", "/sales-workbench"],
  ["Operations Live", "/operations"],
  ["Finance Dashboard", "/finance-dashboard"],
  ["Execution Hub", "Tasks & followups"],
  ["Integrations", "Sync health"],
];

const financeTables = [
  "tally_vouchers_v2",
  "tally_voucher_lines_v2",
  "tally_ledgers_v2",
  "tally_parties_v2",
  "expense_heads_v2",
  "finance_heads_v2",
  "owner_finance_snapshot_v2",
  "reconciliation_issues_v2",
];

const salesTables = [
  "sales_inbox_events",
  "sales_source_accounts",
  "sales_lead_matches",
  "sales_enrichment_records",
  "sales_communications",
  "sales_call_logs",
  "sales_voice_broadcasts",
  "sales_voice_broadcast_recipients",
  "sales_ai_suggestions",
  "sales_calculations",
];

const currentTables = [
  "leads",
  "lead_history",
  "followups",
  "clients",
  "jobs",
  "tasks",
  "orders",
  "quotations",
  "clickup_tasks",
  "integrations",
  "activity_logs",
  "audit_logs",
];

const pendingItems = [
  "Suspense / cash negative",
  "Balance Sheet needs_review",
  "Ledger needs_review",
  "GST needs_review",
  "Operating Expenses needs_review",
  "Profit & Loss needs_review",
  "Tally V2 sync rewrite",
  "Legacy table audit",
  "RLS / security sprint",
];

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "cyan" | "green" | "pink" | "orange" | "purple" | "red" | "yellow" | "slate" }) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
    green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
    pink: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-100",
    orange: "border-orange-400/40 bg-orange-400/10 text-orange-100",
    purple: "border-violet-400/40 bg-violet-400/10 text-violet-100",
    red: "border-red-400/40 bg-red-400/10 text-red-100",
    yellow: "border-yellow-400/40 bg-yellow-400/10 text-yellow-100",
    slate: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Node({ title, sub, tone = "slate" }: { title: string; sub?: string; tone?: "cyan" | "green" | "pink" | "orange" | "purple" | "red" | "yellow" | "slate" }) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/45 bg-cyan-950/55 shadow-cyan-500/10",
    green: "border-emerald-400/45 bg-emerald-950/55 shadow-emerald-500/10",
    pink: "border-fuchsia-400/45 bg-fuchsia-950/55 shadow-fuchsia-500/10",
    orange: "border-orange-400/45 bg-orange-950/55 shadow-orange-500/10",
    purple: "border-violet-400/45 bg-violet-950/55 shadow-violet-500/10",
    red: "border-red-400/45 bg-red-950/55 shadow-red-500/10",
    yellow: "border-yellow-400/45 bg-yellow-950/55 shadow-yellow-500/10",
    slate: "border-slate-500/45 bg-slate-950/70 shadow-slate-500/10",
  };
  return (
    <div className={`rounded-2xl border p-3 shadow-2xl ${tones[tone]}`}>
      <div className="text-sm font-black text-white">{title}</div>
      {sub ? <div className="mt-1 text-xs leading-5 text-slate-300">{sub}</div> : null}
    </div>
  );
}

function Section({ title, tone, children, className = "" }: { title: string; tone: "cyan" | "green" | "pink" | "orange" | "purple" | "red" | "yellow"; children: React.ReactNode; className?: string }) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/45 text-cyan-200",
    green: "border-emerald-400/45 text-emerald-200",
    pink: "border-fuchsia-400/45 text-fuchsia-200",
    orange: "border-orange-400/45 text-orange-200",
    purple: "border-violet-400/45 text-violet-200",
    red: "border-red-400/45 text-red-200",
    yellow: "border-yellow-400/45 text-yellow-200",
  };
  return (
    <section className={`relative rounded-[2rem] border-2 border-dashed bg-slate-950/45 p-5 backdrop-blur ${tones[tone]} ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-wide">{title}</h2>
        <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_20px_currentColor]" />
      </div>
      {children}
    </section>
  );
}

function TableCluster({ title, rows, tone }: { title: string; rows: string[]; tone: "green" | "cyan" | "pink" | "orange" }) {
  return (
    <div className="rounded-2xl border border-slate-600/50 bg-black/25 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        <span className="text-lg">▣</span>
        {title}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <Pill key={row} tone={tone}>{row}</Pill>
        ))}
      </div>
    </div>
  );
}

export default function FbosAgentGraphPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,.16),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(236,72,153,.14),transparent_30%)]" />

      <div className="relative mx-auto max-w-[1900px] px-5 py-8">
        <header className="mb-8 rounded-[2rem] border border-slate-700/70 bg-slate-950/75 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Pill tone="green">Supabase SSOT</Pill>
                <Pill tone="cyan">FinanceOS V2</Pill>
                <Pill tone="pink">Sales OS Next</Pill>
                <Pill tone="orange">GVT Planning</Pill>
                <Pill tone="purple">Operation OS Later</Pill>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">FBOS V1 Actual Agent Graph</h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300 md:text-lg">
                Current repo reality + FinanceOS V2 fixes + Sales OS next + GVT Auto Dialer / Voice Broadcast planning + Operation OS later.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <div className="font-black">Golden rule</div>
              <div className="mt-1 max-w-xl text-emerald-100/85">
                Supabase is SSOT. ClickUp is mirror only. GVT writes call logs first. Sales inputs go through inbox. Finance reads Tally V2 + finance_heads_v2.
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Section title="1. FBOS UI / Current Pages" tone="yellow" className="xl:col-span-3">
            <div className="grid gap-3">
              {uiNodes.map(([title, sub]) => <Node key={title} title={title} sub={sub} tone="yellow" />)}
              <Node title="Header Sync Toolbar" sub="GSheet · Tally · ClickUp Connector · Supabase · Sync All" tone="orange" />
            </div>
          </Section>

          <Section title="2. FinanceOS V2 Current" tone="cyan" className="xl:col-span-5">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  "Tally V2 Vouchers",
                  "Voucher Lines",
                  "Ledgers V2",
                  "Parties V2",
                  "Expense Heads V2",
                ].map((x) => <Node key={x} title={x} tone="cyan" />)}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Node title="Tally V2 Clean Source" sub="normalize voucher, party, ledger, date, amount" tone="cyan" />
                <Node title="Finance Head Builder" sub="clean rows + formulas → owner heads" tone="cyan" />
                <Node title="finance_heads_v2" sub="12 owner heads for dashboard" tone="green" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Node title="V2 Matrix Heads" sub="OK / needs_review cards" tone="purple" />
                <Node title="Filter Options API" sub="party / ledger / balance" tone="purple" />
                <Node title="Ledger Balance Lookup" sub="opening, closing, group" tone="purple" />
              </div>
              <div className="rounded-2xl border border-cyan-400/30 bg-black/25 p-4">
                <div className="mb-3 text-sm font-black text-cyan-100">Finance visible outputs</div>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  {["Sales ₹5.56Cr", "Purchase ₹4.30Cr", "Receipts ₹5.63Cr", "Payments ₹5.66Cr", "Receivables ₹81.61L", "Payables ₹23.94L", "Bank Cash -₹6.79L", "Ledger Balances"].map((x) => <Pill key={x} tone="cyan">{x}</Pill>)}
                </div>
              </div>
            </div>
          </Section>

          <Section title="3. Supabase Memory / SSOT" tone="green" className="xl:col-span-4">
            <div className="grid gap-4">
              <TableCluster title="Current business tables" rows={currentTables} tone="green" />
              <TableCluster title="Finance tables" rows={financeTables} tone="cyan" />
            </div>
          </Section>

          <Section title="4. Sales OS Next + GVT" tone="pink" className="xl:col-span-8">
            <div className="grid gap-5">
              <div className="rounded-2xl border border-fuchsia-400/30 bg-black/25 p-4">
                <div className="mb-3 text-sm font-black text-fuchsia-100">Input Sources</div>
                <div className="flex flex-wrap gap-2">
                  {["Manual", "CSV", "Google Sheets", "ClickUp Import", "IndiaMART", "TradeIndia", "WhatsApp", "Email", "Website / Sweb", "References", "Existing Clients", "Calling / Auto Dialer", "GVT Voice Terminal", "GVT Voice Broadcast", "BIS/MCA/FSSAI", "GST/TIN/TSIN"].map((x) => <Pill key={x} tone="pink">{x}</Pill>)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <Node title="Input Bus" sub="all sources enter here" tone="pink" />
                <Node title="Normalize" sub="clean company, phone, email, requirement" tone="pink" />
                <Node title="sales_inbox_events" sub="first memory for every source" tone="green" />
                <Node title="Duplicate Gate" sub="company, mobile, email, GST, source id" tone="pink" />
                <Node title="Enrichment" sub="BIS, MCA, FSSAI, GST" tone="pink" />
                <Node title="Convert Gate" sub="lead / followup / client / quote" tone="pink" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-fuchsia-400/30 bg-black/25 p-4">
                  <div className="mb-3 text-sm font-black text-fuchsia-100">Specialized agents</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Node title="CRM Agent" sub="pipeline, followups, lead stages" tone="pink" />
                    <Node title="Call Coach Agent" sub="current basic recording + AI analysis" tone="pink" />
                    <Node title="GVT Auto Dialer Agent" sub="today calls, logs, recordings, disposition" tone="orange" />
                    <Node title="GVT Voice Broadcast Agent" sub="campaign audio, target list, results" tone="orange" />
                    <Node title="WhatsApp Agent" sub="messages, intent, timeline" tone="pink" />
                    <Node title="Email Agent" sub="thread, enquiry, timeline" tone="pink" />
                    <Node title="AI Assistant" sub="OpenAI + Ollama/local LLM" tone="purple" />
                    <Node title="Calculator Agent" sub="price, margin, GST, freight" tone="purple" />
                    <Node title="ClickUp Mirror" sub="execution mirror only" tone="yellow" />
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-400/30 bg-black/25 p-4">
                  <div className="mb-3 text-sm font-black text-orange-100">GVT micro mapping</div>
                  <div className="grid gap-2 text-xs text-orange-50/90">
                    {[
                      "Date → sales_call_logs.call_datetime",
                      "Mode → mode / direction",
                      "Client ID → client_external_id",
                      "Caller No. → caller_no",
                      "Caller Name → caller_name",
                      "Duration → duration_seconds",
                      "Disposition → disposition / outcome",
                      "Note → note",
                      "Listen → recording_url / listen_ref",
                    ].map((x) => <div key={x} className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2">{x}</div>)}
                  </div>
                </div>
              </div>

              <TableCluster title="Planned Sales memory tables" rows={salesTables} tone="pink" />
            </div>
          </Section>

          <Section title="5. Dashboards / Outputs" tone="purple" className="xl:col-span-4">
            <div className="grid gap-3">
              {[
                ["CEO Master Dashboard Cards", "finance, sales, ops owner view"],
                ["Finance Dashboard", "V2 heads, canonical Tally, ledger balance"],
                ["Sales & Call Coach", "leads, call summary, AI actions"],
                ["Operations Live", "jobs, clients, order metrics"],
                ["Reports / Tables", "filtered read models"],
                ["Followup Tasks", "Sales next action"],
                ["Quotation Drafts", "calculator + CRM output"],
                ["GVT Broadcast Results", "connected/interested/retry"],
                ["ClickUp Tasks", "execution mirror status"],
              ].map(([title, sub]) => <Node key={title} title={title} sub={sub} tone="purple" />)}
            </div>
          </Section>

          <Section title="6. Operations Current + Later" tone="orange" className="xl:col-span-4">
            <div className="grid gap-3">
              <Node title="Operations Live current" sub="jobs → /api/jobs → live order table" tone="orange" />
              <Node title="Current metrics" sub="Total Orders · Dispatched · In Production · Pending" tone="orange" />
              <Node title="Order Master CSV" sub="UploadZone now, structured import later" tone="orange" />
              <Node title="Operation OS later" sub="ops_inbox_events · ops_entity_links · ops_task_rules" tone="orange" />
              <Node title="Future flow" sub="ops inbox → entity link → task/job/order → dashboard" tone="orange" />
            </div>
          </Section>

          <Section title="7. Pending / Governance / QC" tone="red" className="xl:col-span-4">
            <div className="grid gap-2">
              {pendingItems.map((x) => <Node key={x} title={x} tone="red" />)}
            </div>
          </Section>
        </div>

        <footer className="mt-6 rounded-[2rem] border border-slate-700/70 bg-slate-950/75 p-5 backdrop-blur">
          <div className="mb-4 text-sm font-black text-white">Arrow / color legend</div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="yellow">Yellow = UI / input</Pill>
            <Pill tone="cyan">Cyan = FinanceOS data flow</Pill>
            <Pill tone="green">Green = Supabase read/write</Pill>
            <Pill tone="pink">Pink = Sales / AI / call agents</Pill>
            <Pill tone="orange">Orange = Operation later / GVT planning</Pill>
            <Pill tone="red">Red = pending / QC / security</Pill>
            <Pill tone="purple">Purple = dashboards / outputs</Pill>
          </div>
        </footer>
      </div>
    </main>
  );
}
