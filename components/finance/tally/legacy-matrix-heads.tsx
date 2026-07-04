"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type MetricsResponse = {
  row_count?: number;
  metrics?: Record<string, number | string | Record<string, string>>;
  persisted_metrics?: Record<string, unknown> | null;
  sales_exclusion?: Record<string, unknown>;
};

type ReportResponse = {
  report?: string;
  row_count?: number;
  raw_row_count?: number;
  excluded_row_count?: number;
  exclusion_rule?: string | null;
  sync_status?: string;
  error_count?: number;
  missing_field_count?: number;
  generated_at?: string;
};

type DiagnosticsResponse = {
  row_count?: number;
};

type HeadStatus = {
  key: string;
  label: string;
  status: "synced" | "derived" | "unavailable";
  row_count: number;
  source: string;
  note: string;
};

type HeadStatusResponse = {
  rows?: HeadStatus[];
  data?: {
    rows?: HeadStatus[];
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

function pct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function riskLabel(value: number): string {
  if (value < 0) return "CRITICAL";
  if (value < 5_00_000) return "HIGH";
  return "OK";
}

function statusClass(status: HeadStatus["status"]): string {
  if (status === "synced") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "derived") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export default function LegacyMatrixHeads() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [sales, setSales] = useState<ReportResponse | null>(null);
  const [purchase, setPurchase] = useState<ReportResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [headStatus, setHeadStatus] = useState<HeadStatus[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [m, s, p, d, h] = await Promise.all([
          apiFetch<MetricsResponse>("/api/finance/tally/metrics?from=2024-04-01&to=today"),
          apiFetch<ReportResponse>("/api/finance/tally/reports?from=2024-04-01&to=today&report=sales"),
          apiFetch<ReportResponse>("/api/finance/tally/reports?from=2024-04-01&to=today&report=purchase"),
          apiFetch<DiagnosticsResponse>("/api/finance/tally/diagnostics"),
          apiFetch<HeadStatusResponse>("/api/finance/tally/head-status"),
        ]);
        if (active) {
          setMetrics(m);
          setSales(s);
          setPurchase(p);
          setDiagnostics(d);
          setHeadStatus(h.rows || h.data?.rows || []);
        }
      } catch {
        // Keep this panel passive; canonical dashboard owns errors.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const m = metrics?.metrics || {};
  const revenue = n(m.total_sales);
  const purchaseTotal = n(m.total_purchase);
  const receipts = n(m.total_receipts);
  const payments = n(m.total_payments);
  const receivables = n(m.receivables);
  const payables = n(m.payables);
  const grossProfit = n(m.gross_profit);
  const cashflow = n(m.cashflow);
  const netProfit = n(m.net_profit);
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : NaN;
  const netProfitPct = revenue > 0 ? (netProfit / revenue) * 100 : NaN;
  const currentRatio = payables > 0 ? receivables / payables : NaN;
  const healthScore = Math.max(0, Math.min(100, Math.round((grossMargin || 0) + (cashflow > 0 ? 20 : 0) + (currentRatio > 1 ? 20 : 5))));
  const byKey = Object.fromEntries(headStatus.map((row) => [row.key, row]));

  return (
    <section className="mx-4 sm:mx-5 lg:mx-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">FinanceOS Matrix Heads</h2>
          <p className="text-sm text-slate-600">Canonical Tally values only. TLY-05 heads show synced / derived / unavailable instead of fake values.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 shadow-sm">
          Sales rows: {sales?.row_count ?? "—"} · Purchase rows: {purchase?.row_count ?? "—"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Hero label="Sales" value={money(revenue)} note="Commercial sales" tone="from-emerald-500 to-teal-700" />
        <Hero label="Cashflow" value={money(cashflow)} note={`${money(receipts)} in / ${money(payments)} out`} tone="from-sky-500 to-blue-800" />
        <Hero label="Working Capital" value={money(receivables - payables)} note={`${money(receivables)} AR / ${money(payables)} AP`} tone="from-violet-500 to-indigo-800" />
        <Hero label="Health" value={`${healthScore}/100`} note={`Cash risk ${riskLabel(cashflow)}`} tone="from-slate-700 to-slate-950" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Head title="P&L" status={byKey.profit_loss} rows={[
          ["Revenue", money(revenue)],
          ["Direct Cost", money(purchaseTotal)],
          ["Gross Profit", money(grossProfit)],
          ["Net Profit", money(netProfit)],
          ["Net Profit %", pct(netProfitPct)],
        ]} />
        <Head title="Cashflow / Bank" status={byKey.bank_cash} rows={[
          ["Receipts", money(receipts)],
          ["Payments", money(payments)],
          ["Free Cash", money(cashflow)],
          ["Risk", riskLabel(cashflow)],
        ]} />
        <Head title="Working Capital" rows={[
          ["Receivables", money(receivables)],
          ["Payables", money(payables)],
          ["Current Ratio", Number.isFinite(currentRatio) ? currentRatio.toFixed(1) : "—"],
          ["Gap", money(receivables - payables)],
        ]} />
        <Head title="Receivables" status={byKey.receivables} rows={[
          ["AR Balance", money(receivables)],
          ["Source Rows", String(byKey.receivables?.row_count ?? "—")],
          ["Source", byKey.receivables?.source || "—"],
        ]} />
        <Head title="Payables" status={byKey.payables} rows={[
          ["AP Balance", money(payables)],
          ["Source Rows", String(byKey.payables?.row_count ?? "—")],
          ["Source", byKey.payables?.source || "—"],
        ]} />
        <Head title="Ledger DR/CR" status={byKey.ledger} rows={[
          ["Ledger Masters", String(byKey.ledger?.row_count ?? "—")],
          ["Source", byKey.ledger?.source || "—"],
          ["Status", byKey.ledger?.status || "—"],
        ]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Head title="Bank Loan" rows={[
          ["EBITDA %", pct(grossMargin)],
          ["Sales/Purchase Gap", money(revenue - purchaseTotal)],
          ["Cash Risk", riskLabel(cashflow)],
          ["Docs", "Canonical Tally"],
        ]} />
        <Head title="Balance Sheet" status={byKey.balance_sheet} rows={[
          ["Current Assets", money(receivables)],
          ["Current Liabilities", money(payables)],
          ["Net Worth", byKey.balance_sheet?.status === "synced" ? money(receivables - payables) : "Unavailable"],
          ["Report", byKey.balance_sheet?.status || "unavailable"],
        ]} />
        <Head title="Reconciliation" rows={[
          ["Raw Sales", String(sales?.raw_row_count ?? "—")],
          ["Commercial Sales", String(sales?.row_count ?? "—")],
          ["Excluded", String(sales?.excluded_row_count ?? "—")],
          ["Rule", sales?.exclusion_rule ? "Active" : "—"],
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

function Head({ title, rows, status }: { title: string; rows: Array<[string, string]>; status?: HeadStatus }) {
  return (
    <div className="min-h-[210px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">{title}</h3>
        {status ? <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(status.status)}`}>{status.status}</span> : null}
      </div>
      {status?.note ? <p className="mt-2 line-clamp-2 text-xs text-slate-500">{status.note}</p> : null}
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
