"use client";

import { useEffect, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import MetricCard from "@/components/command-center/metric-card";
import TrendBar from "@/components/command-center/trend-bar";
import UploadZone from "@/components/command-center/upload-zone";
import { apiFetch } from "@/lib/api/client";

type MatrixData = {
  top: Record<string, string | number>;
  trends: Record<string, number>;
  pnl: Record<string, string>;
  cashflow: Record<string, string>;
  workingCapital: {
    receivableAging: Record<string, number>;
    payableAging: Record<string, number>;
    totalReceivable: string;
    totalPayable: string;
  };
  balanceSheet: Record<string, string>;
  bankLoan: Record<string, string>;
  sharkTank: Record<string, string>;
  ownerIntel: Record<string, string>;
  reconciliation: Record<string, string>;
  issues: string[];
  partyWise: Array<{
    party: string;
    bill: string;
    dueDate: string | null;
    overdueDays: number;
    amount: number;
  }>;
};

function fmtAmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function FinanceMatrixPage() {
  const [m, setM] = useState<MatrixData | null>(null);

  useEffect(() => {
    apiFetch<MatrixData>("/api/finance/matrix").then(setM).catch(console.error);
  }, []);

  const t = m?.top;

  return (
    <div className="min-h-screen">
      <CommandHeader title="Finance Dashboard" badge="ALL MATRICES LIVE" />
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-5 lg:px-6 py-4 lg:py-5 space-y-5">
        <h2 className="text-base font-bold text-slate-600 uppercase tracking-widest">
          Finance Complete Dashboard — All Matrices (Live)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard label="Sales" value={t?.sales ?? "—"} accent="green" />
          <MetricCard label="Collections" value={t?.collections ?? "—"} accent="blue" />
          <MetricCard label="Expenses" value={t?.expenses ?? "—"} accent="red" />
          <MetricCard label="Receivable" value={t?.receivable ?? "—"} accent="blue" />
          <MetricCard label="Payable" value={t?.payable ?? "—"} accent="orange" />
          <MetricCard label="Overdue Amount" value={t?.overdueAmount ?? "—"} accent="red" />
          <MetricCard label="Overdue Parties" value={t?.overdueParties ?? "—"} accent="red" />
          <MetricCard label="Free Cash" value={t?.freeCash ?? "—"} accent="green" />
          <MetricCard label="Bad Debts" value={t?.badDebts ?? "—"} accent="green" />
          <MetricCard label="Emergency Fund" value={t?.emergencyFund ?? "—"} accent="purple" />
          <MetricCard label="Reserve Fund" value={t?.reserveFund ?? "—"} accent="blue" />
          <MetricCard label="Overdue Collections" value={t?.overdueCollections ?? "—"} accent="green" />
        </div>

        {m && (
          <>
            <Panel title="Trend Section">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <TrendBar label="Sales Trend" score={m.trends.salesTrend} color="bg-emerald-500" />
                <TrendBar label="Collection Trend" score={m.trends.collectionTrend} color="bg-blue-500" />
                <TrendBar label="Receivable Trend" score={m.trends.receivableTrend} color="bg-orange-500" />
                <TrendBar label="Payable Trend" score={m.trends.payableTrend} color="bg-violet-500" />
                <TrendBar label="Profit Trend" score={m.trends.profitTrend} color="bg-red-500" />
                <TrendBar label="Business Health" score={Math.round(m.trends.businessHealth / 10)} max={10} color="bg-cyan-500" />
              </div>
              <p className="text-center text-2xl font-black text-blue-700 mt-2">
                {m.trends.businessHealth}/100
              </p>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="P&L Section (Live)">
                <FinRow label="Revenue" value={m.pnl.revenue} />
                <FinRow label="Direct Cost" value={`- ${m.pnl.directCost}`} negative />
                <FinRow label="Gross Profit" value={m.pnl.grossProfit} highlight="green" />
                <FinRow label="Operating Expenses" value={`- ${m.pnl.operatingExpenses}`} negative />
                <FinRow label="EBITDA" value={m.pnl.ebitda} highlight="blue" />
                <FinRow label="Net Profit %" value={m.pnl.netProfitPct} bold />
              </Panel>
              <Panel title="Cash Flow Section (Live)">
                <FinRow label="Opening Cash" value={m.cashflow.openingCash} />
                <FinRow label="Collections" value={m.cashflow.collections} highlight="green" />
                <FinRow label="Payments" value={`- ${m.cashflow.payments}`} negative />
                <FinRow label="Closing Cash" value={m.cashflow.closingCash} highlight="blue" />
              </Panel>
            </div>

            <Panel title="Working Capital Section (Live)">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AgingBlock title="Receivable Aging" buckets={m.workingCapital.receivableAging} total={m.workingCapital.totalReceivable} warm />
                <AgingBlock title="Payable Aging" buckets={m.workingCapital.payableAging} total={m.workingCapital.totalPayable} />
              </div>
            </Panel>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniPanel title="Balance Sheet">
                <FinRow label="Current Assets" value={m.balanceSheet.currentAssets} small />
                <FinRow label="Net Worth" value={m.balanceSheet.netWorth} small />
                <FinRow label="Current Ratio" value={m.balanceSheet.currentRatio} small />
              </MiniPanel>
              <MiniPanel title="Bank Loan Metrics">
                <FinRow label="EBITDA %" value={m.bankLoan.ebitdaPct} small />
                <FinRow label="Receivable Days" value={m.bankLoan.receivableDays} small />
                <FinRow label="Payable Days" value={m.bankLoan.payableDays} small />
              </MiniPanel>
              <MiniPanel title="Shark Tank">
                <FinRow label="Revenue (period)" value={m.sharkTank.revenue} small />
                <FinRow label="Gross Margin" value={m.sharkTank.grossMargin} small />
                <FinRow label="Top Customer %" value={m.sharkTank.topCustomerPct} small />
              </MiniPanel>
              <MiniPanel title="Owner Intelligence" accent="purple">
                <FinRow label="Health Score" value={m.ownerIntel.healthScore} small />
                <FinRow label="Cash Risk" value={m.ownerIntel.cashRisk} small danger={m.ownerIntel.cashRisk === "CRITICAL"} />
                <FinRow label="Collection Risk" value={m.ownerIntel.collectionRisk} small danger={m.ownerIntel.collectionRisk === "HIGH"} />
              </MiniPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Reconciliation">
                <FinRow label="Bank Reconciliation" value={m.reconciliation.bank} highlight="green" />
                <FinRow label="Sale Purchase Recon Gap" value={m.reconciliation.salePurchaseGap} highlight="orange" />
              </Panel>
              <Panel title="Top 5 Issues (Live)">
                {m.issues.length === 0 ? (
                  <p className="text-slate-500 text-sm">No critical issues</p>
                ) : (
                  <ul className="space-y-2">
                    {m.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {i + 1}. {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Receivables — Party-wise (Live)">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-[15px]">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left p-2">Party</th>
                      <th className="text-left p-2">Bill</th>
                      <th className="text-left p-2">Due Date</th>
                      <th className="text-right p-2">Overdue Days</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.partyWise.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2 text-slate-900">{r.party}</td>
                        <td className="p-2 font-mono text-xs text-slate-600">{r.bill}</td>
                        <td className="p-2 text-slate-600">{r.dueDate || "—"}</td>
                        <td className={`p-2 text-right font-bold ${r.overdueDays > 60 ? "text-red-700" : "text-slate-600"}`}>
                          {r.overdueDays > 900 ? "—" : r.overdueDays}
                        </td>
                        <td className="p-2 text-right font-semibold text-emerald-700">{fmtAmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        <UploadZone
          label="Upload Finance CSV / Sheet Export"
          accept=".csv,.txt"
          hint="FBOS Master tab: TALLY_IN_RECEIVABLES / 06_Finance_Sync"
        />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-900 text-base uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function MiniPanel({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${accent === "purple" ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white"}`}>
      <h3 className="font-bold text-slate-900 text-sm uppercase mb-2">{title}</h3>
      {children}
    </div>
  );
}

function FinRow({
  label,
  value,
  highlight,
  negative,
  bold,
  small,
  danger,
}: {
  label: string;
  value: string;
  highlight?: "green" | "blue" | "orange";
  negative?: boolean;
  bold?: boolean;
  small?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`flex justify-between ${small ? "text-sm py-1" : "text-[15px] py-2 border-b border-slate-100"}`}>
      <span className="text-slate-600">{label}</span>
      <span
        className={
          danger
            ? "text-red-600 font-bold"
            : highlight
              ? `${highlight === "green" ? "text-emerald-700" : highlight === "blue" ? "text-blue-700" : "text-orange-700"} font-bold`
              : negative
                ? "text-red-600"
                : bold
                  ? "font-bold text-slate-900"
                  : "text-slate-900 font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function AgingBlock({
  title,
  buckets,
  total,
  warm,
}: {
  title: string;
  buckets: Record<string, number>;
  total: string;
  warm?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase mb-2">{title}</p>
      {Object.entries(buckets).map(([k, v]) => (
        <FinRow key={k} label={`${k} Days`} value={fmtAmt(v)} small highlight={warm && k === "90+" ? "orange" : undefined} />
      ))}
      <FinRow label={`Total ${title.split(" ")[0]}`} value={total} bold small />
    </div>
  );
}
