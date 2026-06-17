import Link from "next/link";

export default function SalesWorkbench(){

const modules = [
["Lead Master","/lead-master"],
["ClickUp Leads","/clickup-tasks"],
["Import Engine","/imports"],
["Sales Dashboard","/sales-dashboard"],
["Sales Kanban","/sales-kanban"],
["Today's Followup","/followups/today"],
["Followups","/followups"],
["Quotations","/quotations"],
["Clients","/clients"],
["Sales Reports","/sales-reports"],
["Sales Targets","/sales-targets"],
["Sales Activities","/sales-activities"]
];

return(
<div className="p-8">
<h1 className="text-3xl font-bold mb-6">Sales Workbench</h1>

<div className="grid grid-cols-5 gap-4">

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
