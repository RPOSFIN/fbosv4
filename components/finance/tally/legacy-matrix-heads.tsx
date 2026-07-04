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

export default function LegacyMatrixHeads() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [sales, setSales] = useState<ReportResponse | null>(null);
  const [purchase, setPurchase] = useState<ReportResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [m, s, p, d] = await Promise.all([
          apiFetch<MetricsResponse>("/api/finance/tally/metrics?from=2024-04-01&to=today"),
          apiFetch<ReportResponse>("/api/finance/tally/reports?from=2024-04-01&to=today&report=sales"),
          apiFetch<ReportResponse>("/api/finance/tally/reports?from=2024-04-01&to=today&report=purchase"),
          apiFetch<DiagnosticsResponse>("/api/finance/tally/diagnostics"),
        ]);
        if (active) {
          setMetrics(m);
          setSales(s);
          setPurchase(p);
          setDiagnostics(d);
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

  return (
    <section className="mx-4 sm:mx-5 lg:mx-6 border border-slate-200 bg-white rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">FinanceOS Matrix Heads</h2>
          <p className="text-xs text-slate-500">Restored legacy decision heads; values are canonical Tally-derived or marked by caveat.</p>
        </div>
        <div className="text-xs text-slate-500">Sales rows: {sales?.row_count ?? "—"} / Purchase rows: {purchase?.row_count ?? "—"}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Mini label="Sales" value={money(revenue)} />
        <Mini label="Purchase" value={money(purchaseTotal)} />
        <Mini label="Collections" value={money(receipts)} />
        <Mini label="Payments" value={money(payments)} />
        <Mini label="Receivable" value={money(receivables)} />
        <Mini label="Payable" value={money(payables)} />
        <Mini label="Cashflow" value={money(cashflow)} />
        <Mini label="Health" value={`${healthScore}/100`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
        <Head title="P&L" rows={[
          ["Revenue", money(revenue)],
          ["Direct Cost", money(purchaseTotal)],
          ["Gross Profit", money(grossProfit)],
          ["Net Profit", money(netProfit)],
          ["Net Profit %", pct(netProfitPct)],
        ]} />
        <Head title="Cashflow" rows={[
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
        <Head title="Bank Loan" rows={[
          ["EBITDA %", pct(grossMargin)],
          ["Sales/Purchase Gap", money(revenue - purchaseTotal)],
          ["Cash Risk", riskLabel(cashflow)],
          ["Docs", "Canonical Tally"],
        ]} />
        <Head title="Shark Tank" rows={[
          ["Revenue", money(revenue)],
          ["Gross Margin", pct(grossMargin)],
          ["Growth", "Use trend graph"],
          ["Data Risk", diagnostics?.row_count ? `${diagnostics.row_count} diagnostics` : "OK"],
        ]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Head title="Owner Intel" rows={[
          ["Health", `${healthScore}/100`],
          ["Cash Risk", riskLabel(cashflow)],
          ["Collection Risk", receivables > receipts ? "WATCH" : "OK"],
        ]} />
        <Head title="Balance Sheet" rows={[
          ["Current Assets", money(receivables)],
          ["Current Liabilities", money(payables)],
          ["Net Worth", money(receivables - payables)],
          ["Status", metrics?.persisted_metrics ? "Derived" : "Report unavailable"],
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-md p-2 bg-slate-50 min-h-[58px]">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950 truncate" title={value}>{value}</p>
    </div>
  );
}

function Head({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="border border-slate-200 rounded-md p-2 bg-white">
      <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-900 mb-1">{title}</h3>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 truncate">{label}</span>
            <span className="font-bold text-slate-900 truncate text-right" title={value}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
