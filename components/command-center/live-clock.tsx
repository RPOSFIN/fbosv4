"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="font-mono text-lg">
      {now ? now.toLocaleTimeString("en-IN", { hour12: false }) : "--:--:--"}
    </div>
  );
}
