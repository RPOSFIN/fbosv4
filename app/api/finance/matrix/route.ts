import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { fmtMoney } from "@/lib/finance/matrix";

type FinanceHead = {
  head_key: string;
  row_count: number | null;
  amount: number | string | null;
  qc_status: string | null;
  source_table: string | null;
};

function asNumber(value: number | string | null | undefined): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAmount(heads: Map<string, FinanceHead>, key: string): number {
  return asNumber(heads.get(key)?.amount);
}

function getRows(heads: Map<string, FinanceHead>, key: string): number {
  return Number(heads.get(key)?.row_count || 0);
}

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const { data, error } = await supabase
    .from("finance_heads_v2")
    .select("head_key, row_count, amount, qc_status, source_table");

  if (error) return apiError(error.message, 500);

  const heads = new Map<string, FinanceHead>();
  for (const row of (data || []) as FinanceHead[]) {
    heads.set(row.head_key, row);
  }

  const sales = getAmount(heads, "sales");
  const purchase = getAmount(heads, "purchase");
  const receipts = getAmount(heads, "receipts");
  const payments = getAmount(heads, "payments");
  const receivables = getAmount(heads, "receivables");
  const payables = getAmount(heads, "payables");

  const grossProfit = sales - purchase;
  const freeCash = receipts - payments;
  const workingCapitalGap = receivables - payables;
  const netProfitPct = sales > 0 ? Math.round((grossProfit / sales) * 100) : 0;
  const healthScore = Math.min(100, Math.max(0, Math.round((netProfitPct / 100) * 40 + (freeCash >= 0 ? 30 : 10) + 30)));

  return apiSuccess({
    top: {
      sales: fmtMoney(sales),
      collections: fmtMoney(receipts),
      expenses: fmtMoney(payments),
      receivable: fmtMoney(receivables),
      payable: fmtMoney(payables),
      overdueAmount: fmtMoney(0),
      overdueParties: 0,
      freeCash: fmtMoney(freeCash),
      badDebts: fmtMoney(0),
      emergencyFund: `${fmtMoney(freeCash)}/₹5L`,
      reserveFund: `₹0/₹10L`,
      overdueCollections: 0,
    },
    raw: {
      receivableTotal: receivables,
      payableTotal: payables,
      freeCash,
      healthScore,
      sales,
      collections: receipts,
      expenses: payments,
    },
    trends: {
      salesTrend: 0,
      collectionTrend: 0,
      receivableTrend: receivables > payables ? 6 : 3,
      payableTrend: payables > receivables ? 8 : 3,
      profitTrend: Math.min(10, Math.max(0, Math.round(netProfitPct / 10))),
      businessHealth: healthScore,
    },
    pnl: {
      revenue: fmtMoney(sales),
      directCost: fmtMoney(purchase),
      grossProfit: fmtMoney(grossProfit),
      operatingExpenses: fmtMoney(0),
      ebitda: fmtMoney(grossProfit),
      netProfitPct: `${netProfitPct}%`,
    },
    cashflow: {
      openingCash: fmtMoney(0),
      collections: fmtMoney(receipts),
      payments: fmtMoney(payments),
      closingCash: fmtMoney(freeCash),
    },
    workingCapital: {
      receivableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": receivables },
      payableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": payables },
      totalReceivable: fmtMoney(receivables),
      totalPayable: fmtMoney(payables),
    },
    balanceSheet: {
      currentAssets: fmtMoney(receivables),
      netWorth: fmtMoney(workingCapitalGap),
      currentRatio: payables > 0 ? (receivables / payables).toFixed(1) : "—",
    },
    bankLoan: {
      ebitdaPct: `${netProfitPct}%`,
      receivableDays: "—",
      payableDays: "—",
    },
    sharkTank: {
      revenue: fmtMoney(sales),
      grossMargin: sales > 0 ? `${Math.round((grossProfit / sales) * 100)}%` : "—",
      topCustomerPct: "—",
    },
    ownerIntel: {
      healthScore: `${healthScore}/100`,
      cashRisk: freeCash < 100000 ? "CRITICAL" : freeCash < 500000 ? "HIGH" : "LOW",
      collectionRisk: "LOW",
    },
    reconciliation: {
      bank: "Derived",
      salePurchaseGap: fmtMoney(Math.abs(sales - purchase)),
    },
    qc: {
      source: "finance_heads_v2",
      sales_rows: getRows(heads, "sales"),
      purchase_rows: getRows(heads, "purchase"),
      sales_source: heads.get("sales")?.source_table || null,
      purchase_source: heads.get("purchase")?.source_table || null,
      note: "Matrix values read from FinanceOS v2 heads, not finance_import_queue.",
    },
    issues: [],
    partyWise: [],
  });
}
