"use client";

import { useEffect, useState } from "react";

const FALLBACK = [
  "Being → Doing → Results. Master yourself first. — FLEXIFLAIR",
  "Discipline daily, results compound weekly.",
  "Collections protect cash. Cash protects freedom.",
];

export default function AffirmationCarousel() {
  const [items, setItems] = useState<string[]>(FALLBACK);
  const [idx, setIdx] = useState(0);
  const [seconds, setSeconds] = useState(6);

  useEffect(() => {
    fetch("/api/knowledge/affirmations")
      .then((r) => r.json())
      .then((json) => {
        const rows = json?.data || [];
        const texts = rows
          .map((r: Record<string, unknown>) => String(r.content || r.title || "").trim())
          .filter(Boolean);
        if (texts.length) setItems(texts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), seconds * 1000);
    return () => clearInterval(t);
  }, [items.length, seconds]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-4 min-h-[100px] shadow-sm h-full">
      <button type="button" onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)} className="text-slate-400 hover:text-blue-600 text-3xl">‹</button>
      <div className="flex-1 text-center">
        <p className="text-lg text-slate-800 italic leading-relaxed">{items[idx]}</p>
        <p className="text-sm text-slate-500 mt-2">{idx + 1}/{items.length} · every {seconds}s</p>
      </div>
      <button type="button" onClick={() => setIdx((i) => (i + 1) % items.length)} className="text-slate-400 hover:text-blue-600 text-3xl">›</button>
      <input type="number" min={3} max={60} value={seconds} onChange={(e) => setSeconds(Math.max(3, Number(e.target.value) || 6))} className="w-14 text-sm border border-slate-300 rounded px-1 py-1" title="Rotation seconds" />
    </div>
  );
}
