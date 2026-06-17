import Link from "next/link";

export default function ExecutionBoardPage() {
  const modules = [
    ["Sales Pipeline", "/sales-pipeline"],
    ["Sales Activities", "/sales-activities"],
    ["Sales Targets", "/sales-targets"],
    ["Automation Center", "/automation-center"],
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Execution Hub</h1>
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
