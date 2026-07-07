const balanceRows = [
  ["Assets", "Current Assets", "Cash, bank, stock and receivables", "Use debit balances as positive assets"],
  ["Liabilities", "Current Liabilities", "Creditors, GST, duties and payables", "Show credit balances as positive liabilities"],
  ["Equity", "Capital Account", "Owner capital and reserves", "Normalize sign for display"],
  ["Review", "Needs Review", "Unmapped Tally groups", "Map group before final reporting"],
];

export default function BalanceSheetPage() {
  return (
    <div className="space-y-2 text-[11px]">
      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">FinanceOS</p>
        <h1 className="mt-1 text-base font-bold text-slate-900">Balance Sheet</h1>
        <p className="mt-1 text-[11px] text-slate-500">Assets, liabilities, equity, working capital and ratio command view.</p>
        <p className="mt-2 inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Source: public.v_balance_sheet_clean_v2</p>
      </section>

      <div className="grid gap-1 md:grid-cols-4">
        <Metric title="Total Assets" />
        <Metric title="Total Liabilities" />
        <Metric title="Equity" />
        <Metric title="Net Worth" />
        <Metric title="Working Capital" />
        <Metric title="Current Ratio" />
        <Metric title="Quick Ratio" />
        <Metric title="Needs Review" />
      </div>

      <section className="rounded border border-blue-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Balance Sheet Drill Down</h2>
          <div className="flex gap-1">
            <button className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-700">Export PDF</button>
            <button className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-700">Export Excel</button>
          </div>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse bg-white text-left text-[10px]">
            <thead className="sticky top-0 bg-blue-50 text-blue-800">
              <tr>
                <th className="border border-blue-100 px-2 py-1">Section</th>
                <th className="border border-blue-100 px-2 py-1">Group</th>
                <th className="border border-blue-100 px-2 py-1">Description</th>
                <th className="border border-blue-100 px-2 py-1">Display Rule</th>
              </tr>
            </thead>
            <tbody>
              {balanceRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => <td key={cell} className="border border-blue-100 px-2 py-1 text-slate-700">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-orange-200 bg-orange-50 p-2 text-[11px] text-orange-800">
        Negative amounts from Tally are sign conventions. For liabilities and equity, display absolute value in the UI while keeping raw value for audit.
      </section>
    </div>
  );
}

function Metric({ title }: { title: string }) {
  return <div className="rounded border border-blue-100 bg-white p-2 shadow-sm"><p className="text-[10px] text-slate-500">{title}</p><p className="mt-2 text-sm font-bold text-blue-600">Data required</p></div>;
}
