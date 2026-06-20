"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 shadow-lg">
      <p className="text-4xl font-mono font-bold tracking-wider">
        {now.toLocaleTimeString("en-IN", { hour12: false })}
      </p>
      <p className="text-lg mt-2 opacity-90">
        {now.toLocaleDateString("en-IN", { weekday: "long" })}
      </p>
      <p className="text-sm opacity-75">
        {now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}
