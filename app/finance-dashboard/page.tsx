"use client";

import { useEffect, useMemo, useState } from "react";

type FinanceDashboardResponse = {
  data?: {
    metrics: Record<string, number>;
    counts: Record<string, number>;
    integrations: Record<
      string,
      { status: string; lastSyncAt: string | null; message: string | null }
    >;
  };
};

const cards = [
  ["sales", "Sales"],
  ["collections", "Collections"],
  ["expenses", "Expenses"],
  ["receivable", "Receivable"],
  ["payable", "Payable"],
  ["overdueAmount", "Overdue Amount"],
  ["overdueParties", "Overdue Parties"],
  ["freeCash", "Free Cash"],
  ["badDebts", "Bad Debts"],
  ["emergencyFund", "Emergency Fund"],
  ["reserveFund", "Reserve Fund"],
  ["overdueCollections", "Overdue Collections"],
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function statusClass(status?: string) {
  if (status === "connected") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function Page() {
  const [payload, setPayload] = useState<FinanceDashboardResponse["data"]>();
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/finance/dashboard", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: FinanceDashboardResponse) => setPayload(json.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  const integrations = payload?.integrations ?? {};
  const financeRows = payload?.counts?.finance_import_queue ?? 0;
  const hasFinanceData = financeRows > 0;

  const warning = useMemo(() => {
    if (error) return error;
    if (!payload) return "Loading live finance dashboard...";
    if (!hasFinanceData) {
      return "No live Tally finance rows synced yet. Run Setup-TallyCloud.bat on TS Plus; badges stay pending until rows arrive.";
    }
    return "";
  }, [error, hasFinanceData, payload]);

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            All matrices live from Supabase / Tally sync
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(["gsheet", "tally", "clickup", "supabase"] as const).map((name) => {
            const item = integrations[name];
            const status =
              name === "supabase" ? "connected" : item?.status ?? "pending";
            return (
              <span
                key={name}
                className={`rounded-full border px-3 py-1 ${statusClass(status)}`}
                title={item?.message || undefined}
              >
                {name.toUpperCase()} · {status}
              </span>
            );
          })}
        </div>
      </div>

      {warning ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warning}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, label]) => {
          const value = payload?.metrics?.[key] ?? 0;
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-4 text-2xl font-bold">
                {key === "overdueParties" ? value : money(value)}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-3 text-base font-bold text-slate-900">Live data counts</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <div>Finance rows: {financeRows}</div>
          <div>Jobs: {payload?.counts?.jobs ?? 0}</div>
          <div>ClickUp tasks: {payload?.counts?.clickup_tasks ?? 0}</div>
          <div>Leads: {payload?.counts?.leads ?? 0}</div>
        </div>
      </section>
    </main>
  );
}
