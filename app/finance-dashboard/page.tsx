const fundingCards = [
  ["Valuation View", "12.5 Cr", "Funding decision matrix"],
  ["Funding Ask", "75 L", "Growth and working capital"],
  ["Equity Dilution", "6%", "Keep founder control"],
  ["Monthly Burn", "9.8 L", "Overhead and finance cost"],
];

const loanRows = [
  ["Working Capital", "50 L", "Good", "Stock and receivables"],
  ["CC Limit", "75 L", "Good", "Book debt support"],
  ["OD", "25 L", "Medium", "Short-term gap"],
  ["Term Loan", "1.2 Cr", "Medium", "Expansion only"],
  ["Equipment Loan", "80 L", "Good", "Machine purchase"],
  ["Invoice Finance", "35 L", "Fast", "Collection pressure"],
];

const healthCards = [
  ["Bad Debt", "4.2 L", "High"],
  ["Emergency Fund", "18 L", "Medium"],
  ["Reserve Fund", "32 L", "Good"],
  ["Overdue Collections", "27 L", "High"],
  ["Bank Reconciliation", "Pending", "Medium"],
  ["Sales Reconciliation", "Check", "Medium"],
  ["Purchase Reconciliation", "Check", "Low"],
];

const voucherCards = ["Sales", "Purchase", "Receipt", "Payment", "Contra", "Journal"];

const aiIssues = [
  ["High", "Overdue collections pressure", "Call top overdue parties"],
  ["High", "Bad debt risk", "Review ageing and recovery plan"],
  ["Medium", "Bank reconciliation pending", "Match bank and books"],
  ["Medium", "Loan EMI risk", "Check DSCR before term loan"],
  ["Low", "Reserve rule needed", "Move monthly surplus to reserve"],
];

function badge(level: string) {
  if (level === "High") return "bg-red-50 text-red-700 border-red-200";
  if (level === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  if (level === "Good") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function FinanceDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">FinanceOS Matrix</p>
          <h1 className="text-3xl font-black text-slate-900">Finance Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Funding, bank loan, voucher, reconciliation, and AI issue matrix.</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <input type="date" defaultValue="2024-04-01" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
          <input type="date" defaultValue="2026-07-06" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Refresh</button>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Sync</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {fundingCards.map(([title, value, note]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            <p className="mt-2 text-xs text-slate-600">{note}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-slate-900">Bank Loan Matrix</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="p-3 text-left">Type</th><th className="p-3 text-left">Eligible</th><th className="p-3 text-left">Fit</th><th className="p-3 text-left">Use</th></tr>
            </thead>
            <tbody>
              {loanRows.map(([type, amount, fit, use]) => (
                <tr key={type} className="border-t border-slate-100">
                  <td className="p-3 font-bold">{type}</td><td className="p-3">{amount}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${badge(fit)}`}>{fit}</span></td><td className="p-3 text-slate-600">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-slate-900">Voucher Center</h2>
          <div className="grid grid-cols-2 gap-2">
            {voucherCards.map((name) => <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{name}</p><p className="mt-1 text-xl font-black">0</p></div>)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="mb-3 text-lg font-black text-slate-900">Financial Health Matrix</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {healthCards.map(([name, value, level]) => <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex justify-between gap-2"><p className="font-bold">{name}</p><span className={`rounded-full border px-2 py-1 text-xs font-bold ${badge(level)}`}>{level}</span></div><p className="mt-2 text-lg font-black">{value}</p></div>)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-slate-900">Top 5 Issues by AI</h2>
        <div className="space-y-2">
          {aiIssues.map(([level, title, action], index) => <div key={title} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"><div><p className="font-bold">#{index + 1} {title}</p><p className="text-xs text-slate-600">{action}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${badge(level)}`}>{level}</span></div>)}
        </div>
      </div>
    </div>
  );
}
