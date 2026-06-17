"use client";

import { useState } from "react";
import { testGoogleSync } from "@/lib/google-sync";

export default function GoogleTest(){

const [result,setResult] = useState("");

async function run(){

const data = await testGoogleSync();

setResult(JSON.stringify(data));
}

return(
<div className="p-8">

<h1 className="text-3xl font-bold">
Google Sync Test
</h1>

<button
className="bg-cyan-600 px-4 py-2 rounded mt-5"
onClick={run}
>
Test Connection
</button>

<pre className="mt-5">
{result}
</pre>

</div>
);
}