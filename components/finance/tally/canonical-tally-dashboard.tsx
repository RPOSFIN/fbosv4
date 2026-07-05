"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import SimpleBarChart from "@/components/finance/charts/simple-bar-chart";
import { apiFetch } from "@/lib/api/client";

type ReportOption = { key: string; label: string };

type MatrixResponse = {
  top?: { sales?: string; collections?: string; expenses?: string; receivable?: string; payable?: string; freeCash?: string };
  raw?: { sales?: number; collections?: number; expenses?: number; receivableTotal?: number; payableTotal?: number; freeCash?: number };
  qc?: { source?: string; sales_rows?: number; purchase_rows?: number; sales_source?: string | null; purchase_source?: string | null; note?: string };
};

type MetricsResponse = {
  source: string;
  from: string;
  to: string;
  generated_at: string;
  row_count: number;
  metrics: Record<string, number | string | Record<string, string>>;
  series: Array<{ month: string; sales: number; purchases: number; receipts: number; payments: number; profit: number }>;
};

type TallyVoucher = {
  id: string;
  voucher_no: string | null;
  voucher_type: string | null;
  voucher_date: string | null;
  party_name: string | null;
  ledger_name: string | null;
  reference: string | null;
  narration: string | null;
  amount: number | string | null;
  debit_total: number | string | null;
  credit_total: number | string | null;
  source_report: string | null;
};

type ReportResponse = {
  source: string;
  report: string;
  from: string;
  to: string;
  row_count: number;
  raw_row_count?: number;
  excluded_row_count?: number;
  exclusion_rule?: string | null;
  rows: TallyVoucher[];
  generated_at: string;
  last_sync_at: string | null;
  sync_status: string;
  error_count: number;
  missing_field_count?: number;
  available_reports: ReportOption[];
};

type VouchersResponse = { source: string; row_count: number; rows: TallyVoucher[]; lines: unknown[]; generated_at: string };

type ExpenseRow = {
  party_name: string | null;
  ledger_name: string | null;
  category: string | null;
  voucher_count: number;
  total_debit: number | string;
  total_credit: number | string;
  total_amount: number | string;
  month: string | null;
};

type ExpensesResponse = { row_count: number; rows: ExpenseRow[]; generated_at: string };

type PartyRow = {
  party_name: string;
  party_type: string | null;
  ledger_name: string | null;
  gst_no: string | null;
  opening_balance: number | string | null;
  closing_balance: number | string | null;
  receivable_total: number | string;
  payable_total: number | string;
};

type PartiesResponse = { row_count: number; rows: PartyRow[]; generated_at: string };

type DiagnosticRow = {
  id: string;
  severity: string;
  module: string;
  issue: string;
  evidence: Record<string, unknown>;
  suggestion: string | null;
  status: string;
  created_at: string;
};

type DiagnosticsResponse = { row_count: number; rows: DiagnosticRow[]; generated_at: string };

const DEFAULT_REPORTS: ReportOption[] = [
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "receipt", label: "Receipt" },
  { key: "payment", label: "Payment" },
  { key: "journal", label: "Journal" },
  { key: "contra", label: "Contra" },
  { key: "debit_note", label: "Debit Note" },
  { key: "credit_note", label: "Credit Note" },
  { key: "ledger", label: "Ledger" },
  { key: "profit_loss", label: "Profit & Loss" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "expenses", label: "Expenses" },
  { key: "party_summary", label: "Party Summary" },
  { key: "party_withdrawal", label: "Person/Vendor Withdrawal" },
];

const VOUCHER_TYPES = ["", "Sales", "Purchase", "Receipt", "Payment", "Journal", "Contra", "Debit Note", "Credit Note"];
const CONTROL_CLASS = "w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const ICON_BUTTON_CLASS = "h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = "h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-sky-700 bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60";

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown): string {
  const n = numberValue(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${sign}INR ${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}INR ${(abs / 1_00_000).toFixed(2)}L`;
  return `${sign}INR ${Math.round(abs).toLocaleString("en-IN")}`;
}

function queryString(values: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params.toString();
}

function topExpenses(rows: ExpenseRow[], key: "party_name" | "ledger_name") {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = row[key] || "Unassigned";
    const value = numberValue(row.total_amount);
    if (value < 1000) continue;
    totals.set(label, (totals.get(label) || 0) + value);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, tone: key === "party_name" ? "orange" as const : "violet" as const }));
}

function showParty(row: PartyRow) {
  return Math.max(Math.abs(numberValue(row.receivable_total)), Math.abs(numberValue(row.payable_total)), Math.abs(numberValue(row.closing_balance))) >= 1000;
}

function showExpense(row: ExpenseRow) {
  return numberValue(row.total_amount) >= 1000;
}

export default function CanonicalTallyDashboard() {
  const [from, setFrom] = useState("2024-04-01");
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState("sales");
  const [party, setParty] = useState("");
  const [ledger, setLedger] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [voucherData, setVoucherData] = useState<VouchersResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpensesResponse | null>(null);
  const [parties, setParties] = useState<PartiesResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);

  const filters = useMemo(() => queryString({ from, to, report, party, ledger, voucherType }), [from, to, report, party, ledger, voucherType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMatrix, nextMetrics, nextReport, nextVouchers, nextExpenses, nextParties, nextDiagnostics] = await Promise.all([
        apiFetch<MatrixResponse>("/api/finance/matrix?source=v2"),
        apiFetch<MetricsResponse>(`/api/finance/tally/metrics?${queryString({ from, to })}`),
        apiFetch<ReportResponse>(`/api/finance/tally/reports?${filters}`),
        apiFetch<VouchersResponse>(`/api/finance/tally/vouchers?${filters}`),
        apiFetch<ExpensesResponse>(`/api/finance/tally/expenses?${filters}`),
        apiFetch<PartiesResponse>(`/api/finance/tally/parties?${queryString({ party, ledger })}`),
        apiFetch<DiagnosticsResponse>("/api/finance/tally/diagnostics"),
      ]);
      setMatrix(nextMatrix);
      setMetrics(nextMetrics);
      setReportData(nextReport);
      setVoucherData(nextVouchers);
      setExpenses(nextExpenses);
      setParties(nextParties);
      setDiagnostics(nextDiagnostics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load canonical finance data");
    } finally {
      setLoading(false);
    }
  }, [filters, from, ledger, party, to]);

  useEffect(() => { load(); }, [load]);

  async function syncSelectedReport() {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch("/api/finance/tally/sync", {
        method: "POST",
        body: JSON.stringify({ from, to, report, party: party || null, ledger: ledger || null }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Canonical Tally sync failed");
      await load();
    } finally {
      setSyncing(false);
    }
  }

  const reportOptions = reportData?.available_reports?.length ? reportData.available_reports : DEFAULT_REPORTS;
  const metric = metrics?.metrics || {};
  const series = metrics?.series || [];
  const openDiagnostics = diagnostics?.rows?.filter((row) => row.status !== "resolved") || [];
  const visibleDiagnostics = openDiagnostics.slice(0, 4);
  const visibleExpenses = (expenses?.rows || []).filter(showExpense).slice(0, 60);
  const visibleParties = (parties?.rows || []).filter(showParty).slice(0, 80);

  const v2Sales = matrix?.raw?.sales;
  const v2Purchase = matrix?.raw?.expenses;
  const v2Receipts = matrix?.raw?.collections;
  const v2Payments = matrix?.raw?.freeCash !== undefined && v2Receipts !== undefined ? numberValue(v2Receipts) - numberValue(matrix.raw.freeCash) : undefined;

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-5 lg:px-6 py-4 lg:py-5 space-y-4">
      <section className="border border-slate-200 bg-white rounded-lg p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <Field label="From"><input className={CONTROL_CLASS} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="To"><input className={CONTROL_CLASS} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
          <Field label="Report"><select className={CONTROL_CLASS} value={report} onChange={(event) => setReport(event.target.value)}>{reportOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></Field>
          <Field label="Party / Vendor"><input className={CONTROL_CLASS} value={party} onChange={(event) => setParty(event.target.value)} /></Field>
          <Field label="Ledger"><input className={CONTROL_CLASS} value={ledger} onChange={(event) => setLedger(event.target.value)} /></Field>
          <Field label="Voucher Type"><select className={CONTROL_CLASS} value={voucherType} onChange={(event) => setVoucherType(event.target.value)}>{VOUCHER_TYPES.map((type) => <option key={type || "all"} value={type}>{type || "All"}</option>)}</select></Field>
          <div className="flex items-center gap-2">
            <button className={ICON_BUTTON_CLASS} type="button" onClick={load} disabled={loading} title="Refresh"><RefreshCw size={18} /></button>
            <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={syncSelectedReport} disabled={syncing}><RefreshCw size={18} className={syncing ? "animate-spin" : ""} /><span>{syncing ? "Syncing" : "Sync"}</span></button>
          </div>
        </div>
      </section>

      {error && <section className="border border-rose-200 bg-rose-50 rounded-lg p-3 flex items-start gap-3 text-rose-900"><AlertTriangle size={18} /><p className="text-sm font-medium">{error}</p></section>}

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric label="Sales V2" value={money(v2Sales ?? metric.total_sales)} />
        <Metric label="Purchase V2" value={money(v2Purchase ?? metric.total_purchase)} />
        <Metric label="Collections V2" value={money(v2Receipts ?? metric.total_receipts)} />
        <Metric label="Payments V2" value={money(v2Payments ?? metric.total_payments)} />
        <Metric label="Rows V2" value={matrix?.qc?.sales_rows ?? reportData?.row_count ?? metrics?.row_count ?? 0} />
        <Metric label="Diagnostics" value={openDiagnostics.length} />
      </section>

      <section className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 text-sm">
          <Meta label="Matrix Source" value={matrix?.qc?.source || "finance_heads_v2"} />
          <Meta label="Sales Rows" value={String(matrix?.qc?.sales_rows ?? "-")} />
          <Meta label="Purchase Rows" value={String(matrix?.qc?.purchase_rows ?? "-")} />
          <Meta label="Sales Source" value={matrix?.qc?.sales_source || "-"} />
          <Meta label="Purchase Source" value={matrix?.qc?.purchase_source || "-"} />
          <Meta label="Legacy Queue" value="Not used for summary" />
          <Meta label="Report" value={reportData?.report || report} />
          <Meta label="Generated" value={reportData?.generated_at || metrics?.generated_at || "-"} />
        </div>
      </section>

      {series.length > 0 && <SimpleBarChart title="Monthly Sales / Purchase / Cash" data={series} keys={["sales", "purchases", "receipts", "payments"]} />}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Vouchers" count={voucherData?.row_count ?? 0}>
          <div className="overflow-auto max-h-[520px]">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">No</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Party</th><th className="p-2 text-right">Amount</th></tr></thead>
              <tbody>{(voucherData?.rows || []).slice(0, 120).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-2">{row.voucher_date || "-"}</td><td className="p-2 font-semibold">{row.voucher_no || "-"}</td><td className="p-2">{row.voucher_type || "-"}</td><td className="p-2 max-w-[240px] truncate">{row.party_name || row.ledger_name || "-"}</td><td className="p-2 text-right font-bold">{money(row.amount || row.debit_total || row.credit_total)}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Expenses" count={visibleExpenses.length}>
          <SimpleBarChart title="Top Vendors" data={topExpenses(visibleExpenses, "party_name")} keys={["value"]} />
          <SimpleBarChart title="Top Ledgers" data={topExpenses(visibleExpenses, "ledger_name")} keys={["value"]} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Parties" count={visibleParties.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[520px] overflow-auto">
            {visibleParties.map((row) => <div key={`${row.party_name}-${row.ledger_name}`} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="font-bold text-slate-900 truncate">{row.party_name}</div><div className="text-xs text-slate-500">{row.party_type || "Unclassified"}</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>AR {money(row.receivable_total)}</span><span>AP {money(row.payable_total)}</span><span>Closing {money(row.closing_balance)}</span><span>GST {row.gst_no || "-"}</span></div></div>)}
          </div>
        </Panel>

        <Panel title="AI Diagnostics" count={openDiagnostics.length}>
          <div className="space-y-2">
            {visibleDiagnostics.map((row) => <div key={row.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><div className="font-bold text-amber-900">{row.module} · {row.severity}</div><p className="text-amber-800">{row.issue}</p>{row.suggestion && <p className="mt-1 text-xs text-amber-700">{row.suggestion}</p>}</div>)}
            {!visibleDiagnostics.length && <p className="text-sm text-slate-500">No open diagnostics.</p>}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex-1 min-w-[160px] space-y-1"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-slate-950">{value}</div></div>;
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-900 break-words">{value}</div></div>;
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{count}</span></div>{children}</section>;
}
