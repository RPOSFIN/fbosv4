type Props = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "orange" | "purple" | "red" | "slate";
};

const ACCENTS = {
  blue: "border-blue-200 bg-blue-50",
  green: "border-emerald-200 bg-emerald-50",
  orange: "border-orange-200 bg-orange-50",
  purple: "border-violet-200 bg-violet-50",
  red: "border-red-200 bg-red-50",
  slate: "border-slate-200 bg-white",
};

const VALUE_COLORS = {
  blue: "text-blue-900",
  green: "text-emerald-900",
  orange: "text-orange-900",
  purple: "text-violet-900",
  red: "text-red-900",
  slate: "text-slate-900",
};

export default function MetricCard({ label, value, sub, accent = "slate" }: Props) {
  return (
    <div className={`rounded-xl border p-4 lg:p-5 h-full ${ACCENTS[accent]}`}>
      <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold">{label}</p>
      <p className={`text-2xl lg:text-[1.75rem] font-bold mt-1.5 leading-tight ${VALUE_COLORS[accent]}`}>
        {value}
      </p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
