"use client";

export default function CEOCommandCenter(){

const alerts = [
"43 Followups Pending",
"8 Quotations Awaiting Approval",
"2 High Value Leads Not Contacted",
"Receivable Collection Risk"
];

const priorities = [
"Call Top 10 Pending Leads",
"Review Outstanding Quotations",
"Approve Production Jobs",
"Review Cashflow Position"
];

return(
<div className="p-8 text-white">

<h1 className="text-4xl font-bold mb-6">
AI CEO Command Center
</h1>

<div className="grid grid-cols-4 gap-4 mb-6">

<div className="border rounded-xl p-4">
<div>Total Revenue</div>
<div className="text-3xl font-bold">?52L</div>
</div>

<div className="border rounded-xl p-4">
<div>Receivable</div>
<div className="text-3xl font-bold">?24.5L</div>
</div>

<div className="border rounded-xl p-4">
<div>Payable</div>
<div className="text-3xl font-bold">?8.2L</div>
</div>

<div className="border rounded-xl p-4">
<div>Business Score</div>
<div className="text-3xl font-bold text-green-400">82%</div>
</div>

</div>

<div className="grid grid-cols-2 gap-6">

<div className="border rounded-xl p-5">
<h2 className="text-xl font-bold mb-4">
CEO Alerts
</h2>

{alerts.map((x,i)=>(
<div key={i} className="border-b py-3">
{x}
</div>
))}
</div>

<div className="border rounded-xl p-5">
<h2 className="text-xl font-bold mb-4">
CEO Priorities Today
</h2>

{priorities.map((x,i)=>(
<div key={i} className="border-b py-3">
{x}
</div>
))}
</div>

</div>

<div className="border rounded-xl p-5 mt-6">

<h2 className="text-xl font-bold mb-4">
AI CEO Summary
</h2>

<p>
Sales pipeline is healthy.
Receivable collection requires attention.
Quotation conversion opportunity exists.
Followup backlog should be cleared today.
Overall business trend positive.
</p>

</div>

</div>
);
}
