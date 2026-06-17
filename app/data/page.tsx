import Link from "next/link";

export default function DataCenter(){

const modules = [
["Data Hub","/data-hub"],
["Executive Dashboard","/executive-dashboard"],
["FBOS Intelligence","/fbos-intelligence"]
];

return(
<div className="p-8">

<h1 className="text-3xl font-bold mb-6">
Data Center
</h1>

<div className="grid grid-cols-3 gap-4">

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
