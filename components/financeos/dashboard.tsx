import { initialFinanceDashboard } from "@/lib/financeos/finance-data";

export function FinanceDashboard() {
  const data = initialFinanceDashboard;
  const chartNames = ["Revenue Trend", "Expense Trend", "Cash Flow", "Receivable Aging", "Payable Aging", "Monthly Comparison", "Owner Wise Expenses", "Expense Head Analysis", "Bank Balance Trend", "GST Trend"];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-purple-300">CEO Command Center</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">FinanceOS V3</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Dashboard-first finance command center for cash, profit, receivables, payables, loans, reports and executive decisions.</p>
        <div className="mt-5 grid gap-2 text-xs sm:grid-cols-4">
          {[data.financialYear, data.currentMonth, data.supabaseStatus, data.tallyStatus].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-300">{item}</div>)}
        </div>
      </section>

      <Section title="Home Dashboard" subtitle="Large KPI cards" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">Data required</p>
            <p className="mt-3 text-xs leading-5 text-slate-400">{metric.description}</p>
          </div>
        ))}
      </div>

      <Section title="Executive Cards" subtitle="Health, score and action cards" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.health.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-white">{item.label}</p><span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">--</span></div>
            <p className="mt-3 text-sm text-slate-300">{item.status}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.action}</p>
          </div>
        ))}
      </div>

      <Section title="Charts" subtitle="Responsive panels ready for live source data" />
      <div className="grid gap-4 xl:grid-cols-2">
        {chartNames.map((title) => <Chart key={title} title={title} />)}
      </div>
    </div>
  );
}

function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>;
}

function Chart({ title }: { title: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><h4 className="font-semibold text-white">{title}</h4><div className="mt-5 h-48 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-500">Source pending</div></div>;
}
