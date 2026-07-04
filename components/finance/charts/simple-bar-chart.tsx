"use client";

type BarDatum = {
  label: string;
  value: number;
  tone?: "green" | "blue" | "orange" | "red" | "violet" | "slate";
};

const TONES: Record<NonNullable<BarDatum["tone"]>, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  orange: "bg-amber-500",
  red: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

function fmt(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

export default function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: BarDatum[];
}) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <section className="border border-slate-200 bg-white rounded-lg p-4 min-h-[220px]">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">No canonical rows</p>
        ) : (
          data.map((item) => {
            const width = `${Math.max(4, Math.round((Math.abs(item.value) / max) * 100))}%`;
            return (
              <div key={item.label} className="grid grid-cols-[minmax(92px,150px)_1fr_minmax(56px,80px)] items-center gap-3">
                <span className="truncate text-sm font-medium text-slate-600" title={item.label}>
                  {item.label}
                </span>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${TONES[item.tone || "blue"]}`} style={{ width }} />
                </div>
                <span className="text-right text-sm font-semibold text-slate-900">{fmt(item.value)}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
