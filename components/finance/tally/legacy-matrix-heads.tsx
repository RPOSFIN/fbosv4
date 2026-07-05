"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type MatrixResponse = {
  top?: {
    sales?: string;
    collections?: string;
    expenses?: string;
    receivable?: string;
    payable?: string;
    freeCash?: string;
  };
  raw?: {
    sales?: number;
    collections?: number;
    expenses?: number;
    receivableTotal?: number;
    payableTotal?: number;
    freeCash?: number;
    healthScore?: number;
  };
  pnl?: {
    revenue?: string;
    directCost?: string;
    grossProfit?: string;
    netProfitPct?: string;
  };
  cashflow?: {
    collections?: string;
    payments?: string;
    closingCash?: string;
  };
  workingCapital?: {
    totalReceivable?: string;
    totalPayable?: string;
  };
  balanceSheet?: {
    currentRatio?: string;
    netWorth?: string;
  };
  ownerIntel?: {
    healthScore?: string;
    cashRisk?: string;
  };
  qc?: {
    source?: string;
    sales_rows?: number;
    purchase_rows?: number;
    sales_source?: string | null;
    purchase_source?: string | null;
    note?: string;
  };
};

function n(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown): string {
  const amount = n(value);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `${sign}INR ${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}INR ${(abs / 1_00_000).toFixed(2)}L`;
  return `${sign}INR ${Math.round(abs).toLocaleString("en-IN")}`;
}

export default function LegacyMatrixHeads() {
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<MatrixResponse>("/api/finance/matrix");
        if (active) setMatrix(data);
      } catch {
        // Keep this panel passive; canonical dashboard owns errors.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const raw = matrix?.raw || {};
  const sales = n(raw.sales);
  const purchase = n(raw.expenses);
  const receipts = n(raw.collections);
  const payments = n(raw.expenses);
  const receivables = n(raw.receivableTotal);
  const payables = n(raw.payableTotal);
  const freeCash = n(raw.freeCash);
  const healthScore = n(raw.healthScore);
  const grossProfit = sales - purchase;
  const netProfitPct = sales > 0 ? `${Math.round((grossProfit / sales) * 100)}%` : "—";

  return (
    <section className="mx-4 sm:mx-5 lg:mx-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">FinanceOS Matrix Heads</h2>
          <p className="text-sm text-slate-600">FinanceOS v2 values only. Owner totals no longer read legacy queue tables.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 shadow-sm">
          Sales rows: {matrix?.qc?.sales_rows ?? "—"} · Purchase rows: {matrix?.qc?.purchase_rows ?? "—"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Hero label="Sales" value={matrix?.top?.sales || money(sales)} note="Commercial sales" tone="from-emerald-500 to-teal-700" />
        <Hero label="Cashflow" value={matrix?.top?.freeCash || money(freeCash)} note={`${matrix?.top?.collections || money(receipts)} in / ${matrix?.top?.expenses || money(payments)} out`} tone="from-sky-500 to-blue-800" />
        <Hero label="Working Capital" value={money(receivables - payables)} note={`${matrix?.top?.receivable || money(receivables)} AR / ${matrix?.top?.payable || money(payables)} AP`} tone="from-violet-500 to-indigo-800" />
        <Hero label="Health" value={matrix?.ownerIntel?.healthScore || `${healthScore}/100`} note={`Cash risk ${matrix?.ownerIntel?.cashRisk || "—"}`} tone="from-slate-700 to-slate-950" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Head title="P&L" badge="V2" rows={[
          ["Revenue", matrix?.pnl?.revenue || money(sales)],
          ["Direct Cost", matrix?.pnl?.directCost || money(purchase)],
          ["Gross Profit", matrix?.pnl?.grossProfit || money(grossProfit)],
          ["Net Profit", matrix?.pnl?.grossProfit || money(grossProfit)],
          ["Net Profit %", matrix?.pnl?.netProfitPct || netProfitPct],
        ]} />
        <Head title="Cashflow / Bank" badge="V2" rows={[
          ["Receipts", matrix?.cashflow?.collections || money(receipts)],
          ["Payments", matrix?.cashflow?.payments || money(payments)],
          ["Free Cash", matrix?.cashflow?.closingCash || money(freeCash)],
          ["Risk", matrix?.ownerIntel?.cashRisk || "—"],
        ]} />
        <Head title="Working Capital" badge="V2" rows={[
          ["Receivables", matrix?.workingCapital?.totalReceivable || money(receivables)],
          ["Payables", matrix?.workingCapital?.totalPayable || money(payables)],
          ["Current Ratio", matrix?.balanceSheet?.currentRatio || "—"],
          ["Gap", matrix?.balanceSheet?.netWorth || money(receivables - payables)],
        ]} />
        <Head title="Sales Source" badge="V2" rows={[
          ["Rows", String(matrix?.qc?.sales_rows ?? "—")],
          ["Source", matrix?.qc?.sales_source || "finance_heads_v2"],
          ["Status", "OK"],
        ]} />
        <Head title="Purchase Source" badge="V2" rows={[
          ["Rows", String(matrix?.qc?.purchase_rows ?? "—")],
          ["Source", matrix?.qc?.purchase_source || "finance_heads_v2"],
          ["Status", "OK"],
        ]} />
        <Head title="QC" badge="V2" rows={[
          ["Matrix Source", matrix?.qc?.source || "finance_heads_v2"],
          ["Legacy Queue", "Not used"],
          ["Note", matrix?.qc?.note || "V2 only"],
        ]} />
      </div>
    </section>
  );
}

function Hero({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return (
    <div className={`min-h-[170px] rounded-3xl bg-gradient-to-br ${tone} p-5 text-white shadow-sm`}>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">{label}</p>
      <p className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-none break-words" title={value}>{value}</p>
      <p className="mt-4 text-sm font-semibold text-white/80">{note}</p>
    </div>
  );
}

function Head({ title, rows, badge }: { title: string; rows: Array<[string, string]>; badge?: string }) {
  return (
    <div className="min-h-[210px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">{title}</h3>
        {badge ? <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800">{badge}</span> : null}
      </div>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-b-0">
            <span className="font-semibold text-slate-500 truncate">{label}</span>
            <span className="text-right text-base font-black text-slate-950 truncate" title={value}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
