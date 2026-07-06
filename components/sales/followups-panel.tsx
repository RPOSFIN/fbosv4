"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type Followup = {
  id: string;
  lead_id?: string | null;
  company_name?: string | null;
  contact_person?: string | null;
  next_followup?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type FollowupResponse = {
  followups: Followup[];
  total: number;
};

const ranges = [
  ["today", "Today"],
  ["3d", "Last 3 days"],
  ["7d", "Last 7 days"],
  ["30d", "One month"],
  ["all", "All"],
  ["custom", "Custom"],
];

const statuses = [
  ["all", "All Status"],
  ["Pending", "Pending"],
  ["Completed", "Completed"],
  ["Cancelled", "Cancelled"],
];

function buildParams(input: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export default function FollowupsPanel() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState("3d");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const qs = buildParams({
      range,
      status,
      search,
      from: range === "custom" ? from : "",
      to: range === "custom" ? to : "",
      limit: 100,
    });
    apiFetch<FollowupResponse>(`/api/sales/followups?${qs}`)
      .then((res) => {
        setFollowups(res.followups || []);
        setTotal(res.total || 0);
      })
      .catch(console.error);
  }, [range, status, search, from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateStatus(id: string, nextStatus: string) {
    setBusyId(id);
    try {
      await apiFetch("/api/sales/followups", {
        method: "PATCH",
        body: JSON.stringify({ id, status: nextStatus }),
      });
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">FOLLOWUPS</h3>
          <p className="text-xs text-slate-500">Pending call/action list from Supabase followups.</p>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {total}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
          {ranges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search followup" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={range !== "custom"} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-100" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={range !== "custom"} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-100" />
        </div>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
        {followups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No followups found for this filter.
          </p>
        ) : followups.map((f) => {
          const phone = cleanPhone(f.notes);
          return (
            <div key={f.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.company_name || "Followup"}</p>
                  <p className="text-xs text-slate-500">{f.contact_person || "—"} · {f.next_followup || "No date"}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                  {f.status || "Pending"}
                </span>
              </div>
              {f.notes && <p className="mt-2 line-clamp-3 text-xs text-slate-600 whitespace-pre-line">{f.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(f.id, "Completed")}
                  disabled={busyId === f.id || f.status === "Completed"}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {f.status === "Completed" ? "Completed" : busyId === f.id ? "Saving…" : "Mark Done"}
                </button>
                {phone && <a className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700" href={`tel:+${phone}`}>Call</a>}
                {phone && <a className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">WhatsApp</a>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
