"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type ReportOption = { key: string; label: string };
type LedgerBalance = { closing_balance?: number; opening_balance?: number; parent_group?: string | null; primary_group?: string | null };
type FilterOptions = { party_options?: string[]; ledger_options?: string[]; ledger_balances?: Record<string, LedgerBalance>; source?: string; voucher_type?: string };
type MatrixResponse = { raw?: { sales?: number; collections?: number; expenses?: number; freeCash?: number }; qc?: { source?: string; sales_rows?: number; purchase_rows?: number; sales_source?: string; purchase_source?: string } };
type VoucherRow = { id: string; voucher_date: string | null; voucher_no: string | null; voucher_type: string | null; party_name: string | null; ledger_name: string | null; amount: number | string | null; debit_total: number | string | null; credit_total: number | string | null };
type VoucherResponse = { row_count: number; rows: VoucherRow[]; generated_at: string; report: string };
type ExpenseRow = { party_name: string | null; ledger_name: string | null; category: string | null; total_amount: number | string };
type ExpenseResponse = { row_count: number; rows: ExpenseRow[] };

const REPORTS: ReportOption[] = [
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "receipt", label: "Receipt" },
  { key: "payment", label: "Payment" },
  { key: "journal", label: "Journal" },
  { key: "contra", label: "Contra" },
  { key: "debit_note", label: "Debit Note" },
  { key: "credit_note", label: "Credit Note" },
  { key: "expenses", label: "Expenses" },
  { key: "party_summary", label: "Party Summary" },
];

const VOUCHER_TYPES = ["", "Sales", "Purchase", "Receipt", "Payment", "Journal", "Contra", "Debit Note", "Credit Note"];
const CONTROL = "w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

function qs(values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

function money(value: unknown) {
  const n = Number(value || 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Number.isFinite(n) ? n : 0);
  if (abs >= 10000000) return `${sign}INR ${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}INR ${(abs / 100000).toFixed(2)}L`;
  return `${sign}INR ${Math.round(abs).toLocaleString("en-IN")}`;
}

export default function CanonicalTallyDashboardV2() {
  const [from, setFrom] = useState("2024-04-01");
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState("sales");
  const [party, setParty] = useState("");
  const [ledger, setLedger] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<FilterOptions>({});
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);
  const [vouchers, setVouchers] = useState<VoucherResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse | null>(null);

  const filterQuery = useMemo(() => qs({ from, to, report, party, ledger, voucherType }), [from, to, report, party, ledger, voucherType]);
  const optionQuery = useMemo(() => qs({ from, to, report, voucherType }), [from, to, report, voucherType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextOptions, nextMatrix, nextVouchers, nextExpenses] = await Promise.all([
        apiFetch<FilterOptions>(`/api/finance/tally/filter-options?${optionQuery}`),
        apiFetch<MatrixResponse>("/api/finance/matrix?source=v2"),
        apiFetch<VoucherResponse>(`/api/finance/tally/vouchers?${filterQuery}`),
        apiFetch<ExpenseResponse>(`/api/finance/tally/expenses?${filterQuery}`),
      ]);
      setOptions(nextOptions);
      setMatrix(nextMatrix);
      setVouchers(nextVouchers);
      setExpenses(nextExpenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load finance filters");
    } finally {
      setLoading(false);
    }
  }, [filterQuery, optionQuery]);

  useEffect(() => { load(); }, [load]);

  function changeReport(nextReport: string) {
    setReport(nextReport);
    setParty("");
    setLedger("");
    setVoucherType("");
  }

  const reportLabel = REPORTS.find((item) => item.key === report)?.label || report;
  const partyOptions = options.party_options || [];
  const ledgerOptions = options.ledger_options || [];
  const balances = options.ledger_balances || {};
  const selectedBalance = ledger ? balances[ledger]?.closing_balance : undefined;

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-5 lg:px-6 py-4 lg:py-5 space-y-4">
      <section className="border border-slate-200 bg-white rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 items-end">
          <Field label="From"><input className={CONTROL} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="To"><input className={CONTROL} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
          <Field label="Report"><select className={CONTROL} value={report} onChange={(event) => changeReport(event.target.value)}>{REPORTS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></Field>
          <Field label="Party / Vendor"><select className={CONTROL} value={party} onChange={(event) => setParty(event.target.value)}><option value="">Auto / All {reportLabel} Parties</option>{partyOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Ledger"><select className={CONTROL} value={ledger} onChange={(event) => setLedger(event.target.value)}><option value="">Auto / All {reportLabel} Ledgers</option>{ledgerOptions.map((item) => <option key={item} value={item}>{item} · {money(balances[item]?.closing_balance)}</option>)}</select></Field>
          <Field label="Voucher Type"><select className={CONTROL} value={voucherType} onChange={(event) => { setVoucherType(event.target.value); setParty(""); setLedger(""); }}>{VOUCHER_TYPES.map((item) => <option key={item || "auto"} value={item}>{item || "Auto from Report"}</option>)}</select></Field>
          <button className="h-10 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white disabled:opacity-60" type="button" onClick={load} disabled={loading}><RefreshCw className={loading ? "inline mr-2 animate-spin" : "inline mr-2"} size={16} />Refresh</button>
        </div>
      </section>

      {error && <section className="border border-rose-200 bg-rose-50 rounded-lg p-3 flex items-center gap-2 text-rose-900"><AlertTriangle size={18} /><span className="text-sm font-medium">{error}</span></section>}

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card label="Sales V2" value={money(matrix?.raw?.sales)} />
        <Card label="Purchase V2" value={money(matrix?.raw?.expenses)} />
        <Card label="Collections V2" value={money(matrix?.raw?.collections)} />
        <Card label="Free Cash V2" value={money(matrix?.raw?.freeCash)} />
        <Card label="Selected Ledger Balance" value={ledger ? money(selectedBalance) : "Auto / All"} />
        <Card label="Ledger Options" value={ledgerOptions.length} />
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Meta label="Report" value={report} />
        <Meta label="Voucher Type" value={options.voucher_type || voucherType || "Auto"} />
        <Meta label="Party Options" value={partyOptions.length} />
        <Meta label="Ledger Options" value={ledgerOptions.length} />
        <Meta label="Option Source" value={options.source || "v2"} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Vouchers" count={vouchers?.row_count || 0}>
          <table className="min-w-full text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">No</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Party</th><th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{(vouchers?.rows || []).slice(0, 120).map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-2">{row.voucher_date || "-"}</td><td className="p-2 font-semibold">{row.voucher_no || "-"}</td><td className="p-2">{row.voucher_type || "-"}</td><td className="p-2">{row.party_name || "-"}</td><td className="p-2">{row.ledger_name || "-"}</td><td className="p-2 text-right font-bold">{money(row.amount || row.debit_total || row.credit_total)}</td></tr>)}</tbody></table>
        </Panel>
        <Panel title="Ledgers / Expenses" count={expenses?.row_count || ledgerOptions.length || 0}>
          <div className="space-y-2">{(expenses?.rows || []).slice(0, 30).map((row, index) => <div key={`${row.party_name}-${row.ledger_name}-${index}`} className="rounded border border-slate-200 p-2 text-sm"><div className="font-bold">{row.ledger_name || row.party_name || "Unassigned"}</div><div className="text-xs text-slate-500">{row.category || "ledger"} · {money(row.total_amount)} · Bal {money(balances[row.ledger_name || ""]?.closing_balance)}</div></div>)}{!(expenses?.rows || []).length && ledgerOptions.slice(0, 40).map((name) => <div key={name} className="rounded border border-slate-200 p-2 text-sm"><div className="font-semibold">{name}</div><div className="text-xs text-slate-500">Closing Balance {money(balances[name]?.closing_balance)}</div></div>)}</div>
        </Panel>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-slate-950">{value}</div></div>;
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-900 break-words">{value}</div></div>;
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4 overflow-auto max-h-[560px]"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{count}</span></div>{children}</section>;
}
