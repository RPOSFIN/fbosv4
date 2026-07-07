import type { FinanceDashboardRuntime } from "@/lib/financeos/live-data";

type Tone = "green" | "red" | "blue" | "orange" | "purple";

const kpiTones: Tone[] = ["green", "blue", "red", "blue", "orange", "red", "green", "green", "green", "purple", "purple", "green", "red", "orange", "blue"];

export function FinanceDashboard({ data }: { data: FinanceDashboardRuntime }) {
  return (
    <div className="space-y-2 text-[11px]">
      <Panel title="Finance Complete Dashboard - Live Supabase Metrics">
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((metric, index) => <Kpi key={metric.id} title={metric.label} value={formatMetric(metric.prefix, metric.value, metric.suffix)} tone={kpiTones[index % kpiTones.length]} />)}
        </div>
      </Panel>

      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[150px_150px_150px_minmax(160px,1fr)_minmax(150px,1fr)_150px_70px_80px]">
          <FilterBox label="From" value="Live DB" />
          <FilterBox label="To" value={data.lastSync ? data.lastSync.slice(0, 10) : "—"} />
          <FilterBox label="Report" value="All Sources" />
          <FilterBox label="Party / Vendor" value="Supabase FinanceOS" />
          <FilterBox label="Ledger" value={`${data.ledgerRows.length} live rows`} />
          <FilterBox label="Voucher Type" value={`${data.transactionRows.length} transactions`} />
          <button className="mt-4 h-9 rounded border border-blue-200 bg-white px-2 text-[11px] font-bold text-blue-700">Refresh</button>
          <button className="mt-4 h-9 rounded border border-blue-700 bg-blue-700 px-2 text-[11px] font-bold text-white">Sync</button>
        </div>
      </section>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Source Status">
          {data.sourceRows.map((row) => <Line key={row.cells[0]} left={row.cells[0]} right={row.cells[1]} tone={Number(row.cells[1]) > 0 ? "green" : "orange"} />)}
        </Panel>
        <Panel title="Health Metrics">
          {data.health.slice(0, 7).map((card) => <Line key={card.id} left={card.label} right={card.score === null ? card.status : `${card.score}/100`} tone={card.score && card.score >= 70 ? "green" : "orange"} />)}
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Finance Alerts">
          {data.alerts.map((alert) => <Line key={alert.id} left={alert.title} right={alert.body} tone={alert.tone === "warning" ? "orange" : "blue"} />)}
        </Panel>
        <Panel title="Borrowing / Payable Snapshot">
          {data.agingRows.length > 0 ? data.agingRows.map((row) => <Line key={row.cells.join("-")} left={row.cells[0]} right={row.cells[1]} tone="red" />) : <Empty text="No payables / borrowing rows found." />}
        </Panel>
      </div>

      <Panel title="Ledgers - Live Rows">
        <DataTable columns={["Ledger", "Group", "Opening", "Debit", "Credit", "Closing", "Review"]} rows={data.ledgerRows} empty="No ledger rows in Supabase yet. Sync income, expenses, investments, borrowings or Tally transactions." />
      </Panel>

      <Panel title="Transactions - Latest Rows">
        <DataTable columns={["Date", "Voucher", "Ledger", "Type", "Debit", "Credit", "Status", "Source"]} rows={data.transactionRows} empty="No transactions found in Supabase. Tally/ledger sync has not populated public.transactions yet." />
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

function Kpi({ title, value, tone }: { title: string; value: string; tone: Tone }) {
  return <div className="min-h-16 rounded border border-blue-100 bg-slate-50 p-2"><p className="text-[10px] text-slate-500">{title}</p><p className={`mt-2 text-sm font-bold ${textTone(tone)}`}>{value}</p><p className="mt-1 text-[9px] text-slate-400">live Supabase</p></div>;
}

function Line({ left, right, tone }: { left: string; right: string; tone: Tone }) {
  return <div className="flex items-start justify-between gap-2 border-b border-blue-100 py-1"><span className="text-slate-600">{left}</span><span className={`max-w-[70%] text-right font-semibold ${textTone(tone)}`}>{right}</span></div>;
}

function DataTable({ columns, rows, empty }: { columns: string[]; rows: { cells: string[] }[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse bg-white text-left text-[10px]">
        <thead className="sticky top-0 bg-blue-50 text-blue-800">
          <tr>{columns.map((head) => <th key={head} className="border border-blue-100 px-2 py-1">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, index) => <tr key={`${row.cells.join("-")}-${index}`}>{columns.map((_, colIndex) => <td key={colIndex} className="border border-blue-100 px-2 py-1">{row.cells[colIndex] ?? "—"}</td>)}</tr>) : <tr><td colSpan={columns.length} className="border border-blue-100 px-2 py-4 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded border border-blue-100 bg-slate-50 p-2 text-slate-500">{text}</p>;
}

function formatMetric(prefix: string | undefined, value: number | null, suffix: string | undefined) {
  if (value === null) return "Data required";
  const formatted = prefix === "₹" ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value) : String(value);
  return `${formatted}${suffix ?? ""}`;
}

function textTone(tone: Tone) {
  if (tone === "green") return "text-green-600";
  if (tone === "red") return "text-red-600";
  if (tone === "orange") return "text-orange-500";
  if (tone === "purple") return "text-purple-600";
  return "text-blue-600";
}
