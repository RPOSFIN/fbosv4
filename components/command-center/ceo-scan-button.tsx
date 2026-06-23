"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { panelPad, subheading, body, muted } from "./theme";

type ScanResult = {
  generatedAt: string;
  pendingTasks: Array<{ id: string; title: string; created_by: string; status: string }>;
  openTaskCount: number;
  routes: Array<{ employee: string; slotCount: number; nextTask: string | null; nextTime: string | null }>;
  followupsToday: number;
  pendingOrders: number;
  summary: string;
};

export default function CeoScanButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScanResult | null>(null);

  async function scan() {
    setLoading(true);
    setOpen(true);
    try {
      const res = await apiFetch<ScanResult>("/api/ceo/scan");
      setData(res);
    } catch (e) {
      setData({
        generatedAt: new Date().toISOString(),
        pendingTasks: [],
        openTaskCount: 0,
        routes: [],
        followupsToday: 0,
        pendingOrders: 0,
        summary: e instanceof Error ? e.message : "Scan failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={scan}
        disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2.5 shadow-sm disabled:opacity-60"
        title="CEO Scan — tasks, routes, pending summary"
      >
        {loading ? "Scanning…" : "⚡ CEO Scan"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className={`${panelPad} w-full max-w-2xl mt-8 max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className={subheading}>CEO Scan — One-Click Summary</h2>
                <p className={muted}>
                  {data?.generatedAt
                    ? new Date(data.generatedAt).toLocaleString("en-IN")
                    : "Loading…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>

            {loading ? (
              <p className={body}>Scanning latest tasks, routes & pending items…</p>
            ) : data ? (
              <div className="space-y-4">
                <p className="text-[15px] font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  {data.summary}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Open Tasks" value={data.openTaskCount} />
                  <Stat label="Followups Today" value={data.followupsToday} />
                  <Stat label="Pending Orders" value={data.pendingOrders} />
                </div>

                <section>
                  <h3 className={subheading}>Today&apos;s Routes</h3>
                  <ul className="mt-2 space-y-2">
                    {data.routes.length === 0 ? (
                      <li className={muted}>No routes configured</li>
                    ) : (
                      data.routes.map((r) => (
                        <li
                          key={r.employee}
                          className="text-[15px] border border-slate-200 rounded-lg p-3 bg-slate-50"
                        >
                          <span className="font-semibold text-slate-900">{r.employee}</span>
                          <span className="text-slate-500 ml-2">({r.slotCount} tasks)</span>
                          {r.nextTask && (
                            <p className="text-sm text-slate-600 mt-1">
                              Next {r.nextTime}: {r.nextTask}
                            </p>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section>
                  <h3 className={subheading}>Pending Tasks</h3>
                  <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {data.pendingTasks.length === 0 ? (
                      <li className={muted}>No pending tasks</li>
                    ) : (
                      data.pendingTasks.map((t) => (
                        <li key={t.id} className="text-sm text-slate-700 flex justify-between gap-2 border-b border-slate-100 py-1.5">
                          <span>{t.title}</span>
                          <span className="text-slate-400 shrink-0">{t.created_by}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}
