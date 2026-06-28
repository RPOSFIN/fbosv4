"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

export type FinanceRecord = {
  id: string;
  company: string | null;
  record_type: string | null;
  description: string | null;
  amount: number;
  voucher_date: string | null;
  voucher_no: string | null;
  voucher_type: string | null;
  ledger_name: string | null;
  party_name: string | null;
  debit: number;
  credit: number;
  reference: string | null;
  status: string | null;
  source: string | null;
  created_at: string | null;
};

type Props = {
  title: string;
  subtitle?: string;
  recordType?: string;
  showCashflow?: boolean;
  showSummary?: boolean;
};

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN");
  } catch {
    return value;
  }
}

export default function FinanceQueueView({
  title,
  subtitle,
  recordType,
  showCashflow = false,
  showSummary = false,
}: Props) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (recordType) params.set("record_type", recordType);
        const res = await apiFetch<{ records: FinanceRecord[]; count: number }>(
          `/api/finance/queue?${params}`
        );
        if (!active) return;
        setRecords(res.records || []);
        setCount(res.count ?? res.records?.length ?? 0);
        setError("");
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load finance data");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [recordType]);

  const summary = useMemo(() => {
    const byType = new Map<string, number>();
    let totalAmount = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    for (const r of records) {
      const type = (r.record_type || r.voucher_type || "other").toLowerCase();
      byType.set(type, (byType.get(type) || 0) + Number(r.amount || 0));
      totalAmount += Number(r.amount || 0);
      totalDebit += Number(r.debit || 0);
      totalCredit += Number(r.credit || 0);
    }
    return { byType, totalAmount, totalDebit, totalCredit };
  }, [records]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <Link href="/integrations" className="text-sm text-cyan-400 hover:underline">
          Sync from Sheet →
        </Link>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        {subtitle || `Live data from Google Sheet / Tally queue · ${count.toLocaleString()} records`}
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {showSummary && !loading && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Total Amount" value={`₹${formatMoney(summary.totalAmount)}`} />
          <SummaryCard label="Records Shown" value={String(records.length)} />
          <SummaryCard label="Total Debit" value={`₹${formatMoney(summary.totalDebit)}`} />
          <SummaryCard label="Total Credit" value={`₹${formatMoney(summary.totalCredit)}`} />
        </div>
      )}

      {showSummary && summary.byType.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[...summary.byType.entries()].map(([type, amt]) => (
            <span
              key={type}
              className="text-xs px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300"
            >
              {type}: ₹{formatMoney(amt)}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : records.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400">
          <p>No finance records found ({count} total in queue).</p>
          <p className="mt-2 text-sm">
            Data syncs from FBOS Master sheet tab via{" "}
            <Link href="/integrations" className="text-cyan-400 hover:underline">
              Integrations
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Voucher</th>
                <th className="text-left p-3">Party</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Type</th>
                {showCashflow && (
                  <>
                    <th className="text-right p-3">Debit</th>
                    <th className="text-right p-3">Credit</th>
                  </>
                )}
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="p-3 text-slate-400">{formatDate(r.voucher_date)}</td>
                  <td className="p-3 font-mono text-xs">{r.voucher_no || "—"}</td>
                  <td className="p-3">{r.party_name || r.ledger_name || r.company || "—"}</td>
                  <td className="p-3 text-slate-300">{r.description || "—"}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800">
                      {r.record_type || r.voucher_type || "—"}
                    </span>
                  </td>
                  {showCashflow && (
                    <>
                      <td className="p-3 text-right text-emerald-300">
                        {r.debit ? formatMoney(r.debit) : "—"}
                      </td>
                      <td className="p-3 text-right text-amber-300">
                        {r.credit ? formatMoney(r.credit) : "—"}
                      </td>
                    </>
                  )}
                  <td className="p-3 text-right font-medium">₹{formatMoney(r.amount)}</td>
                  <td className="p-3 text-xs text-slate-500">{r.source || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/40">
      <p className="text-xs text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
