const cards = [
  {
    title: "Receivables",
    description: "Customer outstanding and collection follow-up view.",
    href: "/receivables",
  },
  {
    title: "Payables",
    description: "Vendor dues, payment planning, and pending bills.",
    href: "/payables",
  },
  {
    title: "Cashflow",
    description: "Cash in, cash out, and short-term liquidity snapshot.",
    href: "/cashflow",
  },
  {
    title: "P&L Dashboard",
    description: "Sales, expense, and profit/loss summary.",
    href: "/pnl-dashboard",
  },
];

export default function FinanceDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Clean finance overview. Tally matrix widgets are intentionally removed from this page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-400"
          >
            <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
