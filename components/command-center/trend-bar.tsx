type Props = {
  label: string;
  score: number;
  max?: number;
  color?: string;
};

export default function TrendBar({ label, score, max = 10, color = "bg-blue-600" }: Props) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-bold text-slate-900">{score}/{max}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
