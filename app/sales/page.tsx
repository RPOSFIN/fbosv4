import Link from "next/link";

export default function SalesPage() {
  const modules = [
    ["Lead Master", "/lead-master"],
    ["Import Engine", "/imports"],
    ["Sales Dashboard", "/sales-dashboard"],
    ["Sales Kanban", "/sales-kanban"],
    ["Today's Followup", "/followups/today"],
    ["Followups", "/followups"],
    ["Quotations", "/quotations"],
    ["Clients", "/clients"],
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Sales Intelligence</h1>
      <p className="text-slate-400 mb-6">
        Lead-to-order conversion workbench
      </p>

      <div className="grid grid-cols-4 gap-4">
        {modules.map(([name, href]) => (
          <Link
            key={href}
            href={href}
            className="border rounded-xl p-5 hover:border-cyan-400"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}
