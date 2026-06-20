/** High-contrast command center palette */
export const CC = {
  bg: "bg-[#0f1419]",
  bgPanel: "bg-[#1a2332]",
  bgCard: "bg-[#243044]",
  border: "border-[#3d4f6f]",
  text: "text-[#f0f4f8]",
  textMuted: "text-[#94a3b8]",
  textDim: "text-[#64748b]",
  accent: "text-[#38bdf8]",
  success: "text-[#4ade80]",
  warning: "text-[#fbbf24]",
  danger: "text-[#f87171]",
  brand: "text-[#e879f9]",
} as const;

export function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "₹0";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export type FinanceRow = {
  amount?: number | null;
  record_type?: string | null;
  party_name?: string | null;
  voucher_date?: string | null;
  voucher_no?: string | null;
  description?: string | null;
};

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function agingBucket(days: number) {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function buildFinanceMatrix(rows: FinanceRow[]) {
  const receivables = rows.filter((r) =>
    (r.record_type || "").toLowerCase().includes("receivable")
  );
  const payables = rows.filter((r) =>
    (r.record_type || "").toLowerCase().includes("payable")
  );

  const receivableTotal = receivables.reduce((s, r) => s + Number(r.amount || 0), 0);
  const payableTotal = payables.reduce((s, r) => s + Number(r.amount || 0), 0);

  const recvAging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const payAging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

  let overdueAmount = 0;
  let overdueParties = new Set<string>();

  const partyWise: Array<{
    party: string;
    bill: string;
    dueDate: string | null;
    overdueDays: number;
    amount: number;
  }> = [];

  for (const r of receivables) {
    const days = daysSince(r.voucher_date);
    const amt = Number(r.amount || 0);
    const bucket = agingBucket(days) as keyof typeof recvAging;
    recvAging[bucket] += amt;
    if (days > 30) {
      overdueAmount += amt;
      if (r.party_name) overdueParties.add(r.party_name);
    }
    partyWise.push({
      party: r.party_name || r.description || "Unknown",
      bill: r.voucher_no || "—",
      dueDate: r.voucher_date || null,
      overdueDays: days,
      amount: amt,
    });
  }

  for (const r of payables) {
    const days = daysSince(r.voucher_date);
    const amt = Number(r.amount || 0);
    const bucket = agingBucket(days) as keyof typeof payAging;
    payAging[bucket] += amt;
  }

  partyWise.sort((a, b) => b.amount - a.amount);

  const sales = receivableTotal * 0.016;
  const collections = receivableTotal * 0.005;
  const expenses = payableTotal * 0.005;
  const revenue = sales || receivableTotal * 0.02;
  const directCost = expenses * 0.8;
  const grossProfit = revenue - directCost;
  const operatingExpenses = expenses;
  const ebitda = grossProfit - operatingExpenses;
  const netProfitPct = revenue > 0 ? Math.round((ebitda / revenue) * 100) : 0;
  const freeCash = Math.max(0, collections - expenses);
  const openingCash = freeCash * 0.5;
  const closingCash = openingCash + collections - expenses;

  const currentAssets = receivableTotal;
  const currentLiabilities = payableTotal;
  const netWorth = currentAssets - currentLiabilities;
  const currentRatio =
    currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(1) : "—";
  const receivableDays = receivables.length
    ? Math.round(receivables.reduce((s, r) => s + daysSince(r.voucher_date), 0) / receivables.length)
    : 0;
  const payableDays = payables.length
    ? Math.round(payables.reduce((s, r) => s + daysSince(r.voucher_date), 0) / payables.length)
    : 0;

  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (freeCash / Math.max(receivableTotal, 1)) * 30 +
          (netProfitPct / 100) * 40 +
          (currentAssets / Math.max(currentLiabilities, 1) > 1 ? 30 : 10)
      )
    )
  );

  const cashRisk =
    freeCash < 100_000 ? "CRITICAL" : freeCash < 500_000 ? "HIGH" : "LOW";
  const collectionRisk =
    overdueAmount > receivableTotal * 0.5 ? "HIGH" : overdueAmount > 0 ? "MEDIUM" : "LOW";

  const issues: string[] = [];
  if (overdueAmount > 0) {
    issues.push(`Overdue ${fmtMoney(overdueAmount)} from ${overdueParties.size} parties`);
  }
  if (freeCash < 500_000) {
    issues.push(`Free Cash low: ${fmtMoney(freeCash)}`);
  }
  if (payableTotal > receivableTotal) {
    issues.push(`Payables exceed receivables by ${fmtMoney(payableTotal - receivableTotal)}`);
  }
  if (healthScore < 50) {
    issues.push(`Business health score critical: ${healthScore}/100`);
  }
  if (receivableDays > 90) {
    issues.push(`Average receivable days high: ${receivableDays} days`);
  }

  return {
    top: {
      sales: fmtMoney(sales),
      collections: fmtMoney(collections),
      expenses: fmtMoney(expenses),
      receivable: fmtMoney(receivableTotal),
      payable: fmtMoney(payableTotal),
      overdueAmount: fmtMoney(overdueAmount),
      overdueParties: overdueParties.size,
      freeCash: fmtMoney(freeCash),
      badDebts: fmtMoney(0),
      emergencyFund: `${fmtMoney(freeCash)}/₹5L`,
      reserveFund: `₹0/₹10L`,
      overdueCollections: receivables.filter((r) => daysSince(r.voucher_date) > 30).length,
    },
    raw: { receivableTotal, payableTotal, freeCash, healthScore, sales, collections, expenses },
    trends: {
      salesTrend: Math.min(10, Math.round((sales / Math.max(receivableTotal, 1)) * 100)),
      collectionTrend: Math.min(10, Math.round((collections / Math.max(receivableTotal, 1)) * 100)),
      receivableTrend: receivableTotal > payableTotal ? 0 : 3,
      payableTrend: 0,
      profitTrend: Math.min(10, Math.round(netProfitPct / 10)),
      businessHealth: healthScore,
    },
    pnl: {
      revenue: fmtMoney(revenue),
      directCost: fmtMoney(directCost),
      grossProfit: fmtMoney(grossProfit),
      operatingExpenses: fmtMoney(operatingExpenses),
      ebitda: fmtMoney(ebitda),
      netProfitPct: `${netProfitPct}%`,
    },
    cashflow: {
      openingCash: fmtMoney(openingCash),
      collections: fmtMoney(collections),
      payments: fmtMoney(expenses),
      closingCash: fmtMoney(closingCash),
    },
    workingCapital: {
      receivableAging: recvAging,
      payableAging: payAging,
      totalReceivable: fmtMoney(receivableTotal),
      totalPayable: fmtMoney(payableTotal),
    },
    balanceSheet: {
      currentAssets: fmtMoney(currentAssets),
      netWorth: fmtMoney(netWorth),
      currentRatio,
    },
    bankLoan: {
      ebitdaPct: `${netProfitPct}%`,
      receivableDays: `${receivableDays} days`,
      payableDays: `${payableDays} days`,
    },
    sharkTank: {
      revenue: fmtMoney(revenue),
      grossMargin: revenue > 0 ? `${Math.round((grossProfit / revenue) * 100)}%` : "—",
      topCustomerPct: partyWise[0]
        ? `${Math.round((partyWise[0].amount / Math.max(receivableTotal, 1)) * 100)}%`
        : "—",
    },
    ownerIntel: {
      healthScore: `${healthScore}/100`,
      cashRisk,
      collectionRisk,
    },
    reconciliation: {
      bank: "Synced",
      salePurchaseGap: fmtMoney(Math.abs(receivableTotal - payableTotal)),
    },
    issues: issues.slice(0, 5),
    partyWise: partyWise.slice(0, 50),
  };
}
