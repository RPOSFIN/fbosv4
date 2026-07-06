import type { FinanceModule } from "@/lib/financeos/finance-types";

export function FinanceModulePage({ item }: { item: FinanceModule }) {
  return (
    <div className="space-y-2 text-[11px]">
      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{item.eyebrow}</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">{item.title}</h2>
        <p className="mt-1 text-[11px] text-slate-500">{item.description}</p>
        <p className="mt-2 inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Source: {item.sourceHint}</p>
      </section>

      <div className="grid gap-1 md:grid-cols-3">
        {item.metrics.map((metric) => (
          <div key={metric.id} className="rounded border border-blue-100 bg-white p-2 shadow-sm">
            <p className="text-[10px] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-sm font-bold text-blue-600">Data required</p>
            <p className="mt-1 text-[10px] text-slate-400">{metric.description}</p>
          </div>
        ))}
      </div>

      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Drill Down</h3>
          <div className="flex gap-1"><button className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-700">Export PDF</button><button className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-700">Export Excel</button></div>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse bg-white text-left text-[10px]">
            <thead className="sticky top-0 bg-blue-50 text-blue-800">
              <tr>{item.tableColumns.map((col) => <th key={col} className="border border-blue-100 px-2 py-1">{col}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td colSpan={item.tableColumns.length} className="border border-blue-100 px-2 py-6 text-center text-slate-500">Connect source view to show live rows.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
