import Link from "next/link";

export default function FinanceWorkbench(){

const modules = [
["FinanceOS Preview","/financeos"],
["Receivables","/receivables"],
["Payables","/payables"],
["Cashflow","/cashflow"],
["P&L Dashboard","/pnl-dashboard"]
];

return(
<div className="p-8">

<h1 className="text-3xl font-bold mb-6">
Finance Workbench
</h1>

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

{modules.map((m)=>(
<Link
key={m[1]}
href={m[1]}
className="border rounded-xl p-5 hover:border-cyan-400"
>
{m[0]}
</Link>
))}

</div>

</div>
);
}
