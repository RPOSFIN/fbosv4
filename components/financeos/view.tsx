import type { FinanceModule } from "@/lib/financeos/finance-types";

export function FinanceModulePage({ item }: { item: FinanceModule }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{item.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{item.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{item.description}</p>
        <p className="mt-4 inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs text-blue-100">Source: {item.sourceHint}</p>
      </section>
      <div className="grid gap-3 md:grid-cols-3">
        {item.metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">Data required</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">{metric.description}</p>
          </div>
        ))}
      </div>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-xl font-semibold text-white">Drill Down</h3>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.08] text-xs uppercase tracking-wide text-slate-400">
              <tr>{item.tableColumns.map((col) => <th key={col} className="px-4 py-3">{col}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td colSpan={item.tableColumns.length} className="px-4 py-10 text-center text-slate-500">Connect source view to show live rows.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
