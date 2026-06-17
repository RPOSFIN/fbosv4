export default function SalesPipeline(){

const stages = [
"New Lead",
"Qualified",
"Requirement",
"Quotation Sent",
"Negotiation",
"Won",
"Lost"
];

return(

<div className="p-8">

<h1 className="text-3xl font-bold mb-6">
Sales Pipeline
</h1>

<div className="grid grid-cols-7 gap-3">

{stages.map((x)=>(
<div
key={x}
className="border rounded-xl p-4 min-h-[400px]"
>
<h2 className="font-bold mb-3">
{x}
</h2>
</div>
))}

</div>

</div>

);
}
