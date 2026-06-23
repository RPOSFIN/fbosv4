"use client";

import { useEffect, useState } from "react";

export default function HorizontalClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour12: false });
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-4 shadow-md w-full">
      <div className="flex items-center gap-5 flex-wrap">
        <span className="text-3xl lg:text-4xl font-mono font-bold tracking-wide">
          {timeStr}
        </span>
        <div className="text-base lg:text-lg">
          <p className="font-semibold">{weekday}</p>
          {dateStr && <p className="text-blue-100 text-sm">{dateStr}</p>}
        </div>
      </div>
      <p className="text-sm text-blue-100 font-medium">FLEXIFLAIR · Live</p>
    </div>
  );
}
