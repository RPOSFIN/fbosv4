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

function getQc(heads: Map<string, FinanceHead>, key: string): string | null {
  return heads.get(key)?.qc_status || null;
}

function getSource(heads: Map<string, FinanceHead>, key: string): string | null {
  return heads.get(key)?.source_table || null;
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
  const bankCash = getAmount(heads, "bank_cash");
  const receivables = getAmount(heads, "receivables");
  const payables = getAmount(heads, "payables");

  const grossProfit = sales - purchase;
  const netCashFlow = receipts - payments;
  const workingCapitalGap = receivables - payables;
  const netProfitPct = sales > 0 ? Math.round((grossProfit / sales) * 100) : 0;
  const healthScore = Math.min(100, Math.max(0, Math.round((netProfitPct / 100) * 40 + (bankCash >= 0 ? 30 : 10) + 30)));

  return apiSuccess({
    top: {
      sales: fmtMoney(sales),
      collections: fmtMoney(receipts),
      payments: fmtMoney(payments),
      expenses: fmtMoney(payments),
      purchase: fmtMoney(purchase),
      bankCash: fmtMoney(bankCash),
      netCashFlow: fmtMoney(netCashFlow),
      receivable: fmtMoney(receivables),
      payable: fmtMoney(payables),
      overdueAmount: fmtMoney(0),
      overdueParties: 0,
      freeCash: fmtMoney(bankCash),
      badDebts: fmtMoney(0),
      emergencyFund: `${fmtMoney(bankCash)}/₹5L`,
      reserveFund: `₹0/₹10L`,
      overdueCollections: 0,
    },
    raw: {
      receivableTotal: receivables,
      payableTotal: payables,
      bankCash,
      netCashFlow,
      freeCash: bankCash,
      healthScore,
      sales,
      purchase,
      payments,
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
      netCashFlow: fmtMoney(netCashFlow),
      closingCash: fmtMoney(bankCash),
      bankCash: fmtMoney(bankCash),
    },
    workingCapital: {
      receivableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": receivables },
      payableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": payables },
      totalReceivable: fmtMoney(receivables),
      totalPayable: fmtMoney(payables),
    },
    balanceSheet: {
      currentAssets: fmtMoney(receivables + Math.max(bankCash, 0)),
      bankCash: fmtMoney(bankCash),
      netWorth: fmtMoney(workingCapitalGap + bankCash),
      currentRatio: payables > 0 ? ((receivables + Math.max(bankCash, 0)) / payables).toFixed(1) : "—",
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
      cashRisk: bankCash < 100000 ? "CRITICAL" : bankCash < 500000 ? "HIGH" : "LOW",
      collectionRisk: "LOW",
    },
    reconciliation: {
      bank: getQc(heads, "bank_cash") === "ok" ? "OK" : "Needs Review",
      salePurchaseGap: fmtMoney(Math.abs(sales - purchase)),
    },
    qc: {
      source: "finance_heads_v2",
      sales_rows: getRows(heads, "sales"),
      purchase_rows: getRows(heads, "purchase"),
      receipt_rows: getRows(heads, "receipts"),
      payment_rows: getRows(heads, "payments"),
      bank_cash_rows: getRows(heads, "bank_cash"),
      receivable_rows: getRows(heads, "receivables"),
      payable_rows: getRows(heads, "payables"),
      sales_source: getSource(heads, "sales"),
      purchase_source: getSource(heads, "purchase"),
      receipt_source: getSource(heads, "receipts"),
      payment_source: getSource(heads, "payments"),
      bank_cash_source: getSource(heads, "bank_cash"),
      receivable_source: getSource(heads, "receivables"),
      payable_source: getSource(heads, "payables"),
      sales_qc: getQc(heads, "sales"),
      purchase_qc: getQc(heads, "purchase"),
      receipt_qc: getQc(heads, "receipts"),
      payment_qc: getQc(heads, "payments"),
      bank_cash_qc: getQc(heads, "bank_cash"),
      receivable_qc: getQc(heads, "receivables"),
      payable_qc: getQc(heads, "payables"),
      note: "Matrix values read from FinanceOS v2 heads. Legacy finance_import_queue and finance_transactions are not owner sources.",
    },
    issues: [],
    partyWise: [],
  });
}
