"use client";

type Props = {
  label: string;
  accept?: string;
  hint?: string;
  onFile?: (file: File) => void;
};

export default function UploadZone({ label, accept, hint, onFile }: Props) {
  return (
    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors min-h-[120px] w-full">
      <span className="text-3xl mb-2">📁</span>
      <span className="text-base font-semibold text-slate-800">{label}</span>
      {hint && <span className="text-sm text-slate-500 mt-1 text-center">{hint}</span>}
      <input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && onFile) onFile(f); }} />
    </label>
  );
}
