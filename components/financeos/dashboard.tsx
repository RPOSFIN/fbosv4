import { initialFinanceDashboard } from "@/lib/financeos/finance-data";

type Tone = "green" | "red" | "blue" | "orange" | "purple";

const kpiTones: Tone[] = ["green", "blue", "red", "blue", "orange", "red", "green", "green", "green", "purple", "purple", "green", "red", "orange", "blue"];
const sourceRows = ["Revenue", "Purchase", "Receipts", "Payments", "Ledger Mapping", "GST Status", "Loan Limits"];
const expenseRows = ["Jai Parkash", "Riya", "Staff Welfare", "Other Expenses", "General Office"];
const agingRows = ["0-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total Outstanding"];

export function FinanceDashboard() {
  const data = initialFinanceDashboard;

  return (
    <div className="space-y-2 text-[11px]">
      <Panel title="Finance Complete Dashboard - All Metrics Live">
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((metric, index) => <Kpi key={metric.id} title={metric.label} tone={kpiTones[index % kpiTones.length]} />)}
        </div>
      </Panel>

      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[150px_150px_150px_minmax(160px,1fr)_minmax(150px,1fr)_150px_70px_80px]">
          <FilterBox label="From" value="01-04-2024" />
          <FilterBox label="To" value="06-07-2026" />
          <FilterBox label="Report" value="Sales" />
          <FilterBox label="Party / Vendor" value="All Parties / Vendors" />
          <FilterBox label="Ledger" value="All Ledgers" />
          <FilterBox label="Voucher Type" value="All" />
          <button className="mt-4 h-9 rounded border border-blue-200 bg-white px-2 text-[11px] font-bold text-blue-700">Refresh</button>
          <button className="mt-4 h-9 rounded border border-blue-700 bg-blue-700 px-2 text-[11px] font-bold text-white">Sync</button>
        </div>
      </section>

      <Panel title="Score Metrics">
        <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
          <Score title="Cash Health" value="0 / 10" tone="green" />
          <Score title="Liquidity Score" value="10 / 10" tone="blue" />
          <Score title="Receivable Score" value="10 / 10" tone="orange" />
          <Score title="Expense Health" value="10 / 10" tone="purple" />
          <Score title="Profit Score" value="0 / 10" tone="red" />
          <Score title="Business Rating" value="60 / 100" tone="blue" />
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="P&L / Source Status">
          {sourceRows.map((row, idx) => <Line key={row} left={row} right={idx < 2 ? "ok" : "--"} tone={idx < 2 ? "green" : "blue"} />)}
        </Panel>
        <Panel title="Cash Flow / Alerts">
          {["Opening Cash", "Cash In", "Cash Out", "Closing Cash", "Free Cash"].map((row, idx) => <Line key={row} left={row} right={idx === 4 ? "review" : "--"} tone={idx === 4 ? "orange" : "blue"} />)}
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Receivables Aging">
          {agingRows.map((row, idx) => <Line key={row} left={row} right="--" tone={idx === 4 ? "purple" : "orange"} />)}
        </Panel>
        <Panel title="Payables Aging">
          {agingRows.map((row, idx) => <Line key={row} left={row} right="--" tone={idx === 4 ? "purple" : "red"} />)}
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Expense Control">
          {expenseRows.map((row, idx) => <Progress key={row} label={row} value={[80, 92, 55, 100, 20][idx]} />)}
        </Panel>
        <Panel title="Bank Loan Matrix">
          {["Outstanding", "Interest Rate", "EMI", "Due Date", "DSCR", "Loan Health"].map((row) => <Line key={row} left={row} right="Data required" tone="blue" />)}
        </Panel>
        <Panel title="Shark Tank India Matrix">
          {["Business Valuation", "Revenue", "EBITDA", "Burn Rate", "Runway", "AI Score"].map((row) => <Line key={row} left={row} right="Data required" tone="purple" />)}
        </Panel>
      </div>

      <Panel title="Transactions - Latest Rows">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse bg-white text-left text-[10px]">
            <thead className="sticky top-0 bg-blue-50 text-blue-800">
              <tr>{["Date", "Voucher", "Ledger", "Type", "Debit", "Credit", "Status", "Source"].map((head) => <th key={head} className="border border-blue-100 px-2 py-1">{head}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td colSpan={8} className="border border-blue-100 px-2 py-4 text-center text-slate-500">Connect Supabase/Tally source to show live transaction rows.</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FilterBox({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><div className="h-9 rounded border border-blue-200 bg-white px-2 py-2 text-[11px] text-slate-900">{value}</div></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded border border-blue-200 bg-white p-2 shadow-sm"><h2 className="mb-2 border-b border-blue-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-blue-800">{title}</h2>{children}</section>;
}

function Kpi({ title, tone }: { title: string; tone: Tone }) {
  return <div className="min-h-16 rounded border border-blue-100 bg-slate-50 p-2"><p className="text-[10px] text-slate-500">{title}</p><p className={`mt-2 text-sm font-bold ${textTone(tone)}`}>₹0</p><p className="mt-1 text-[9px] text-slate-400">source pending</p></div>;
}

function Score({ title, value, tone }: { title: string; value: string; tone: Tone }) {
  return <div className="rounded border border-blue-100 bg-slate-50 p-2"><p className="text-[10px] text-slate-500">{title}</p><p className={`text-right text-sm font-bold ${textTone(tone)}`}>{value}</p></div>;
}

function Line({ left, right, tone }: { left: string; right: string; tone: Tone }) {
  return <div className="flex items-center justify-between border-b border-blue-100 py-1"><span className="text-slate-600">{left}</span><span className={`font-semibold ${textTone(tone)}`}>{right}</span></div>;
}

function Progress({ label, value }: { label: string; value: number }) {
  const tone = value >= 100 ? "bg-red-500" : value >= 90 ? "bg-orange-500" : value >= 80 ? "bg-yellow-500" : "bg-green-500";
  return <div className="border-b border-blue-100 py-1"><div className="flex justify-between"><span>{label}</span><span>{value}%</span></div><div className="mt-1 h-1.5 rounded bg-slate-200"><div className={`h-1.5 rounded ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} /></div></div>;
}

function textTone(tone: Tone) {
  if (tone === "green") return "text-green-600";
  if (tone === "red") return "text-red-600";
  if (tone === "orange") return "text-orange-500";
  if (tone === "purple") return "text-purple-600";
  return "text-blue-600";
}
