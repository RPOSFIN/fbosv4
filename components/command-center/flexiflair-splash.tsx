"use client";

import { useEffect, useState } from "react";

export default function FlexiflairSplash() {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setVisible(false), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050810] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1e3a5f_0%,_#050810_70%)] animate-pulse" />
      <div
        className={`relative text-center transition-all duration-700 ${
          phase >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <p
          className={`text-6xl md:text-8xl font-black tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.5)] ${
            phase >= 2 ? "animate-pulse" : ""
          }`}
        >
          FLEXIFLAIR
        </p>
        <p className="text-[#94a3b8] mt-4 text-sm tracking-widest uppercase">
          Business Operating System
        </p>
      </div>
    </div>
  );
}
