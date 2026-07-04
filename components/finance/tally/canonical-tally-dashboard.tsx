"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import SimpleBarChart from "@/components/finance/charts/simple-bar-chart";
import { apiFetch } from "@/lib/api/client";

type ReportOption = { key: string; label: string };

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
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, tone: key === "party_name" ? "orange" as const : "violet" as const }));
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
      const [nextMetrics, nextReport, nextVouchers, nextExpenses, nextParties, nextDiagnostics] = await Promise.all([
        apiFetch<MetricsResponse>(`/api/finance/tally/metrics?${queryString({ from, to })}`),
        apiFetch<ReportResponse>(`/api/finance/tally/reports?${filters}`),
        apiFetch<VouchersResponse>(`/api/finance/tally/vouchers?${filters}`),
        apiFetch<ExpensesResponse>(`/api/finance/tally/expenses?${filters}`),
        apiFetch<PartiesResponse>(`/api/finance/tally/parties?${queryString({ party, ledger })}`),
        apiFetch<DiagnosticsResponse>("/api/finance/tally/diagnostics"),
      ]);
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
        <Metric label="Sales" value={money(metric.total_sales)} />
        <Metric label="Purchase" value={money(metric.total_purchase)} />
        <Metric label="Collections" value={money(metric.total_receipts)} />
        <Metric label="Payments" value={money(metric.total_payments)} />
        <Metric label="Rows" value={reportData?.row_count ?? metrics?.row_count ?? 0} />
        <Metric label="Diagnostics" value={openDiagnostics.length} />
      </section>

      <section className="border border-slate-200 bg-white rounded-lg p-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 text-sm">
          <Meta label="Source" value={reportData?.source || metrics?.source || "canonical_supabase"} />
          <Meta label="State" value={reportData?.sync_status || "unknown"} />
          <Meta label="Last Sync" value={reportData?.last_sync_at || "-"} />
          <Meta label="Generated" value={reportData?.generated_at || metrics?.generated_at || "-"} />
          <Meta label="Report From" value={reportData?.from || from} />
          <Meta label="Report To" value={reportData?.to || to} />
          <Meta label="Report" value={reportData?.report || report} />
          <Meta label="Excluded" value={String(reportData?.excluded_row_count ?? 0)} />
        </div>
      </section>

      {visibleDiagnostics.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3 mb-2"><h3 className="text-xs font-black uppercase tracking-wide text-amber-900">Tally diagnostics</h3><span className="text-xs text-amber-800">showing {visibleDiagnostics.length} of {openDiagnostics.length}</span></div>
          <div className="divide-y divide-amber-200">
            {visibleDiagnostics.map((row) => <div key={row.id} className="py-1.5 text-xs flex items-center gap-3"><span className="font-bold text-amber-900 w-20">{row.severity}</span><span className="font-semibold text-slate-900 flex-1 truncate">{row.issue}</span><span className="text-slate-600 flex-1 truncate">{row.suggestion || row.module}</span></div>)}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        <SimpleBarChart title="Sales Trend" data={series.map((row) => ({ label: row.month, value: row.sales, tone: "green" }))} />
        <SimpleBarChart title="Purchase Trend" data={series.map((row) => ({ label: row.month, value: row.purchases, tone: "orange" }))} />
        <SimpleBarChart title="Receipts / Payments" data={[{ label: "Receipts", value: numberValue(metric.total_receipts), tone: "blue" }, { label: "Payments", value: numberValue(metric.total_payments), tone: "red" }]} />
        <SimpleBarChart title="Expense Party" data={topExpenses(visibleExpenses, "party_name")} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <DataPanel title="Voucher Table" icon={<Search size={18} />}>
          <Table headers={["Date", "No", "Type", "Party", "Ledger", "Amount", "Source"]} rows={(voucherData?.rows || []).slice(0, 120).map((row) => [row.voucher_date || "-", row.voucher_no || row.reference || "-", row.voucher_type || "-", row.party_name || "-", row.ledger_name || "-", money(row.amount), row.source_report || "-"])} />
        </DataPanel>

        <DataPanel title="Expense Summary Table">
          <p className="mb-3 text-xs text-slate-500">Shows month-wise party/vendor/ledger totals from canonical expense/payment/purchase lines. Rows below INR 1,000 are hidden to keep owner view clean.</p>
          <Table headers={["Month", "Party", "Ledger", "Vouchers", "Debit", "Credit", "Total"]} rows={visibleExpenses.map((row) => [row.month || "-", row.party_name || "-", row.ledger_name || row.category || "-", String(row.voucher_count || 0), money(row.total_debit), money(row.total_credit), money(row.total_amount)])} />
        </DataPanel>

        <DataPanel title="Party Summary Table">
          <p className="mb-3 text-xs text-slate-500">Shows parties with receivable, payable, or closing balance of at least INR 1,000. Zero/low-value parties are hidden.</p>
          <Table headers={["Party", "Type", "Ledger", "GST", "Receivable", "Payable", "Closing"]} rows={visibleParties.map((row) => [row.party_name, row.party_type || "-", row.ledger_name || "-", row.gst_no || "-", money(row.receivable_total), money(row.payable_total), money(row.closing_balance)])} />
        </DataPanel>
      </section>

      {loading && <div className="fixed bottom-4 right-4 border border-slate-200 bg-white rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">Loading canonical FinanceOS</div>}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-[150px] flex-1"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</span>{children}</label>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="border border-slate-200 bg-white rounded-lg p-3 min-h-[72px]"><p className="text-xs uppercase tracking-wide text-slate-500 font-bold">{label}</p><p className="mt-1 text-lg font-black text-slate-950 break-words">{value}</p></article>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate font-semibold text-slate-900" title={value}>{value}</p></div>;
}

function DataPanel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="border border-slate-200 bg-white rounded-lg p-4"><div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h3></div>{children}</section>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto max-h-[320px]"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200"><tr>{headers.map((header) => <th key={header} className="text-left px-3 py-2 whitespace-nowrap">{header}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td className="px-3 py-4 text-slate-500" colSpan={headers.length}>No canonical rows</td></tr> : rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("|")}`} className="border-t border-slate-100 hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="px-3 py-2 max-w-[240px] truncate" title={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
