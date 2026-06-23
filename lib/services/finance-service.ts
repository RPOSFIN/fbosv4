import { getAdminClient } from "@/lib/supabase/admin";
import { getDashboardStatus, type DashboardStatus } from "@/lib/dashboard/status";
import { buildFinanceMatrix, fmtMoney, type FinanceRow } from "@/lib/finance/matrix";

export type FinanceDashboardPayload = {
  metrics: DashboardStatus["finance"];
  counts: DashboardStatus["counts"];
  integrations: Record<
    string,
    { status: string; lastSyncAt: string | null; message: string | null }
  >;
};

export async function getFinanceDashboardData(
  integrations: Array<{
    connector_name: string;
    status: string;
    last_sync_at: string | null;
    error_message: string | null;
  }>
): Promise<FinanceDashboardPayload> {
  const dashboard = await getDashboardStatus();
  return {
    metrics: dashboard.finance,
    counts: dashboard.counts,
    integrations: Object.fromEntries(
      integrations.map((integration) => [
        integration.connector_name,
        {
          status: integration.status,
          lastSyncAt: integration.last_sync_at,
          message: integration.error_message,
        },
      ])
    ),
  };
}

function buildMatrixFromDashboard(status: DashboardStatus) {
  const f = status.finance;
  const top = {
    sales: fmtMoney(f.sales),
    collections: fmtMoney(f.collections),
    expenses: fmtMoney(f.expenses),
    receivable: fmtMoney(f.receivable),
    payable: fmtMoney(f.payable),
    overdueAmount: fmtMoney(f.overdueAmount),
    overdueParties: f.overdueParties,
    freeCash: fmtMoney(f.freeCash),
    badDebts: fmtMoney(f.badDebts),
    emergencyFund: `${fmtMoney(f.emergencyFund)}/₹5L`,
    reserveFund: `${fmtMoney(f.reserveFund)}/₹10L`,
    overdueCollections: f.overdueCollections,
  };

  return {
    top,
    raw: { ...f, healthScore: 0 },
    trends: {
      salesTrend: 0,
      collectionTrend: 0,
      receivableTrend: 0,
      payableTrend: 0,
      profitTrend: 0,
      businessHealth: 0,
    },
    pnl: {
      revenue: top.sales,
      directCost: fmtMoney(0),
      grossProfit: fmtMoney(f.sales - f.expenses),
      operatingExpenses: top.expenses,
      ebitda: fmtMoney(f.sales - f.expenses),
      netProfitPct: "0%",
    },
    cashflow: {
      openingCash: fmtMoney(0),
      collections: top.collections,
      payments: top.expenses,
      closingCash: top.freeCash,
    },
    workingCapital: {
      receivableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": f.receivable },
      payableAging: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": f.payable },
      totalReceivable: top.receivable,
      totalPayable: top.payable,
    },
    balanceSheet: {
      currentAssets: top.receivable,
      netWorth: fmtMoney(f.receivable - f.payable),
      currentRatio: f.payable > 0 ? (f.receivable / f.payable).toFixed(1) : "—",
    },
    bankLoan: {
      ebitdaPct: "0%",
      receivableDays: "0 days",
      payableDays: "0 days",
    },
    sharkTank: {
      revenue: top.sales,
      grossMargin: "—",
      topCustomerPct: "—",
    },
    ownerIntel: {
      healthScore: "0/100",
      cashRisk: f.freeCash > 0 ? "LOW" : "CRITICAL",
      collectionRisk: f.overdueAmount > 0 ? "HIGH" : "LOW",
    },
    reconciliation: {
      bank: "Synced",
      salePurchaseGap: fmtMoney(Math.abs(f.receivable - f.payable)),
    },
    issues:
      status.counts.finance_import_queue > 0
        ? []
        : ["No live Tally finance rows synced yet"],
    partyWise: [],
  };
}

export async function getFinanceMatrix() {
  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("finance_import_queue")
      .select("amount, record_type, party_name, voucher_date, voucher_no, description")
      .limit(2000);
    if (error) throw new Error(error.message);
    return buildFinanceMatrix((data as FinanceRow[]) || []);
  }

  const status = await getDashboardStatus();
  return buildMatrixFromDashboard(status);
}
