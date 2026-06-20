"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommandHeader from "@/components/command-center/command-header";
import TrendBar from "@/components/command-center/trend-bar";
import UploadZone from "@/components/command-center/upload-zone";
import { apiFetch } from "@/lib/api/client";
import { useRouteAlarm } from "@/hooks/use-route-alarm";
import { pageShell, panelPad, inputCls, subheading, muted } from "@/components/command-center/theme";

type Route = {
  employee: string;
  slots: { time: string; task: string }[];
  updated_at: string;
};

export default function ExecutionHubPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selected, setSelected] = useState("");
  const [priorities, setPriorities] = useState("");
  const [motivation, setMotivation] = useState("");
  const [progress, setProgress] = useState({ dispatch: 66, leads: 50, collections: 5 });

  useRouteAlarm(routes);

  useEffect(() => {
    apiFetch<{ routes: Route[] }>("/api/execution/routes")
      .then((res) => {
        setRoutes(res.routes || []);
        if (res.routes?.[0]) setSelected(res.routes[0].employee);
      })
      .catch(console.error);
    apiFetch<{
      operations: { dispatched: number; totalOrders: number };
      sales: { won: number; totalLeads: number };
      finance: { freeCash: number; receivable: number };
    }>("/api/dashboard/command-center")
      .then((d) => {
        setProgress({
          dispatch: Math.round((d.operations.dispatched / Math.max(d.operations.totalOrders, 1)) * 100),
          leads: Math.round((d.sales.won / Math.max(d.sales.totalLeads, 1)) * 100),
          collections: Math.round((d.finance.freeCash / Math.max(d.finance.receivable, 1)) * 100),
        });
      })
      .catch(() => {});
  }, []);

  const current = routes.find((r) => r.employee === selected);

  async function updateSlot(index: number, time: string) {
    if (!selected) return;
    const res = await apiFetch<Route>("/api/execution/routes", {
      method: "PATCH",
      body: JSON.stringify({ employee: selected, index, time }),
    });
    setRoutes((prev) => prev.map((r) => (r.employee === selected ? res : r)));
  }

  function analyzePriorities() {
    const lines = priorities.split("\n").filter(Boolean);
    if (!lines.length) {
      setMotivation("Pehle 3 priorities likho — clarity se discipline aati hai.");
      return;
    }
    setMotivation(
      `Focus: "${lines[0]}". Block 90 min, then "${lines[1] || "follow-ups"}". End with "${lines[2] || "CRM update"}".`
    );
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(`Priority update: ${lines[0]}`);
      u.lang = "en-IN";
      window.speechSynthesis.speak(u);
    }
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Execution Hub" badge="ROUTE ALARM + VOICE ACTIVE" />
      <div className={`${pageShell} space-y-5`}>
        <section className={`${panelPad} space-y-4`}>
          <h3 className={subheading}>Employee Route & Discipline Tracker</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={inputCls}
              >
                <option value="">— Select Employee —</option>
                {routes.map((r) => (
                  <option key={r.employee} value={r.employee}>
                    {r.employee} ({r.slots.length} tasks)
                  </option>
                ))}
              </select>
              {current && (
                <p className={`${muted} mt-2`}>
                  Synced: {new Date(current.updated_at).toLocaleString("en-IN")}
                </p>
              )}
              <div className="mt-3 space-y-2">
                {current?.slots.map((slot, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(i, e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-[15px] w-32"
                    />
                    <span className="text-[15px] text-slate-700 flex-1">{slot.task}</span>
                  </div>
                ))}
              </div>
            </div>
            <UploadZone
              label="Upload Custom Routes (CSV/TXT)"
              hint="EmployeeName, HH:MM, Task Description"
              accept=".csv,.txt"
            />
          </div>
        </section>

        <section className={panelPad}>
          <h3 className={`${subheading} mb-4`}>Daily Progress & Gap Analysis</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div>
              <label className="text-[15px] font-medium text-slate-700">Top 3 priorities today?</label>
              <textarea
                value={priorities}
                onChange={(e) => setPriorities(e.target.value)}
                className={`${inputCls} mt-2 min-h-[7rem]`}
              />
              <button
                type="button"
                onClick={analyzePriorities}
                className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[15px] font-semibold"
              >
                Analyze & Motivate
              </button>
              {motivation && (
                <p className="mt-3 text-[15px] text-blue-900 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  {motivation}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Progress Overview (Live)</p>
              <TrendBar label="Orders Dispatched" score={Math.round(progress.dispatch / 10)} color="bg-emerald-500" />
              <TrendBar label="Leads Converted" score={Math.round(progress.leads / 10)} color="bg-blue-500" />
              <TrendBar label="Collections vs Receivable" score={Math.max(1, Math.round(progress.collections / 10))} color="bg-orange-500" />
            </div>
          </div>
        </section>

        <section className={panelPad}>
          <h3 className={`${subheading} mb-4`}>SOP & Affirmation Manager</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UploadZone label="Upload SOP File (.txt)" accept=".txt" />
            <UploadZone label="Upload Affirmations (1 per line)" accept=".txt" />
          </div>
          <div className="flex gap-5 mt-4">
            <Link href="/knowledge-hub/sops" className="text-[15px] text-blue-700 hover:underline font-medium">
              SOP Library →
            </Link>
            <Link href="/compliance" className="text-[15px] text-blue-700 hover:underline font-medium">
              Vendor Compliance →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
