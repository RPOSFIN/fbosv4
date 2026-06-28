"use client";

import { useEffect, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import UploadZone from "@/components/command-center/upload-zone";
import { apiFetch } from "@/lib/api/client";
import { pageShell, panelPad, inputCls, subheading, body, muted } from "@/components/command-center/theme";

type Obs = { id: string; module: string; text: string; depends_on: string[]; status: string };
type Err = { id: string; module: string; message: string; depends_on: string[]; severity: string; resolved: boolean };

export default function CompliancePage() {
  const [orderId, setOrderId] = useState("FFT/26-27/01");
  const [vendor, setVendor] = useState("");
  const [result, setResult] = useState<{
    allowed: boolean;
    message: string;
    checklist: string[];
    assignedVendor: string | null;
  } | null>(null);
  const [orders, setOrders] = useState<Array<{ orderId: string; vendor: string }>>([]);
  const [observations, setObservations] = useState<Obs[]>([]);
  const [errors, setErrors] = useState<Err[]>([]);
  const [obsText, setObsText] = useState("");
  const [errText, setErrText] = useState("");

  useEffect(() => {
    apiFetch<{ orders: Array<{ orderId: string; vendor: string }> }>("/api/operations/vendor-check")
      .then((r) => setOrders(r.orders || []))
      .catch(console.error);
    loadObs().catch(console.error);
    loadErr().catch(console.error);
  }, []);

  async function loadObs() {
    const r = await apiFetch<{ items: Obs[] }>("/api/observations");
    setObservations(r.items || []);
  }
  async function loadErr() {
    const r = await apiFetch<{ items: Err[] }>("/api/observations?type=errors");
    setErrors(r.items || []);
  }

  async function validate() {
    const res = await apiFetch<typeof result>("/api/operations/vendor-check", {
      method: "POST",
      body: JSON.stringify({ orderId, vendor }),
    });
    setResult(res);
  }

  async function addObs() {
    if (!obsText.trim()) return;
    await apiFetch("/api/observations", {
      method: "POST",
      body: JSON.stringify({ text: obsText, module: "compliance", depends_on: ["vendor_check"] }),
    });
    setObsText("");
    await loadObs();
  }

  async function addErr() {
    if (!errText.trim()) return;
    await apiFetch("/api/observations", {
      method: "POST",
      body: JSON.stringify({ kind: "error", message: errText, module: "compliance", severity: "high", depends_on: ["vendor_check"] }),
    });
    setErrText("");
    await loadErr();
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Compliance Hub" badge="VENDOR · OBSERVATIONS · ERRORS" />
      <div className={`${pageShell} space-y-5`}>
        <p className={body}>
          Order galat vendor par place nahi hoga. Observations aur errors ki dependencies yahan track hoti hain.
          Orders sirf FBOS se · WhatsApp tasks → #task in chat.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className={`${panelPad} xl:col-span-2 space-y-4`}>
            <h3 className={subheading}>Validate Order → Vendor</h3>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls} placeholder="Order ID" />
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls} placeholder="Requested vendor" />
            <button type="button" onClick={validate} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[15px]">
              Check Vendor Compliance
            </button>
            {result && (
              <div className={`p-4 rounded-lg text-[15px] border ${result.allowed ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"}`}>
                <p className="font-bold">{result.message}</p>
                <ul className="mt-3 space-y-1 text-sm">{result.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            )}
            <UploadZone label="Upload Vendor Mapping (CSV)" hint="orderId, vendorName" accept=".csv" />
          </div>

          <div className={`${panelPad}`}>
            <h3 className={subheading}>Assigned Orders</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto mt-3">
              {orders.map((o) => (
                <button key={o.orderId} type="button" onClick={() => { setOrderId(o.orderId); setVendor(o.vendor); }} className="w-full text-left p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-400 text-[15px]">
                  <span className="font-mono font-semibold text-blue-800">{o.orderId}</span>
                  <span className="text-slate-600 ml-2">→ {o.vendor}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`${panelPad} space-y-3`}>
            <h3 className={subheading}>👁 Observations</h3>
            <textarea value={obsText} onChange={(e) => setObsText(e.target.value)} className={`${inputCls} min-h-[72px]`} placeholder="Add observation…" />
            <button type="button" onClick={addObs} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold">Add Observation</button>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {observations.map((o) => (
                <li key={o.id} className="text-sm border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <span className="text-xs font-bold text-blue-600 uppercase">{o.module}</span>
                  <p className="text-slate-800 mt-1">{o.text}</p>
                  <p className={muted}>Depends: {o.depends_on.join(", ")}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${panelPad} space-y-3`}>
            <h3 className={subheading}>⚠ Errors</h3>
            <input value={errText} onChange={(e) => setErrText(e.target.value)} className={inputCls} placeholder="Log error…" />
            <button type="button" onClick={addErr} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">Log Error</button>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {errors.map((e) => (
                <li key={e.id} className="text-sm border border-red-200 rounded-lg p-3 bg-red-50">
                  <span className="text-xs font-bold text-red-700 uppercase">{e.severity} · {e.module}</span>
                  <p className="text-red-900 mt-1">{e.message}</p>
                  <p className={muted}>Depends: {e.depends_on.join(", ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
