import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { countTodayFollowups } from "@/lib/followups/fetch";
import { getServerSupabase } from "@/lib/rbac/api-auth";
import { getDashboardStatus } from "@/lib/dashboard/status";
import { getLeadSalesMetrics } from "@/lib/services/lead-service";
import { getOperationsMetrics } from "@/lib/services/operations-service";

function sumAmount(rows: { amount?: number | null; record_type?: string | null }[], type: string) {
  return rows
    .filter((r) => (r.record_type || "").toLowerCase().includes(type))
    .reduce((s, r) => s + Number(r.amount || 0), 0);
}

function formatCr(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const salesMetrics = await getLeadSalesMetrics();
  const supabase = getAdminClient();

  if (!supabase) {
    const dashboard = await getDashboardStatus();
    const counts = dashboard.counts;
    const finance = dashboard.finance;
    const receivable = finance.receivable;
    const payable = finance.payable;
    const freeCash = finance.freeCash;
    const healthScore =
      receivable > 0 ? Math.min(100, Math.round((freeCash / receivable) * 100)) : 0;

    return apiSuccess({
      sales: {
        totalLeads: salesMetrics.totalLeads,
        won: salesMetrics.won,
        active: salesMetrics.active,
        lost: salesMetrics.lost,
        pendingFollowups: counts.followups,
        dormantLeads: salesMetrics.dormantLeads,
      },
      operations: await getOperationsMetrics(),
      finance: {
        receivable,
        payable,
        freeCash,
        healthScore,
        receivableLabel: formatCr(receivable),
        payableLabel: formatCr(payable),
        freeCashLabel: formatCr(freeCash),
        queueCount: counts.finance_import_queue,
      },
      trends: {
        salesTrend: Math.min(
          10,
          Math.round((salesMetrics.won / Math.max(salesMetrics.totalLeads, 1)) * 10)
        ),
        collectionTrend: 0,
        profitTrend: 0,
        receivableTrend: 0,
      },
      alerts: {
        freeCashWarning:
          counts.finance_import_queue === 0
            ? "No live Tally finance rows synced yet"
            : null,
        topOverdueParty: null,
      },
    });
  }

  const [operations, financeRes, followupsToday] = await Promise.all([
    getOperationsMetrics(),
    supabase
      .from("finance_import_queue")
      .select("amount, record_type, party_name, voucher_date")
      .limit(2000),
    countTodayFollowups(supabase).catch(() => 0),
  ]);

  const finance = financeRes.data || [];
  const receivable = sumAmount(finance, "receivable");
  const payable = sumAmount(finance, "payable");
  const freeCash = Math.max(0, receivable - payable);
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (salesMetrics.won / Math.max(salesMetrics.totalLeads, 1)) * 40 +
          (operations.dispatched / Math.max(operations.totalOrders, 1)) * 30 +
          (freeCash / Math.max(receivable, 1)) * 30
      )
    )
  );

  const salesTrend = Math.min(
    10,
    Math.round((salesMetrics.won / Math.max(salesMetrics.totalLeads, 1)) * 10)
  );
  const collectionTrend = Math.min(10, Math.round((freeCash / Math.max(receivable, 1)) * 10));
  const profitTrend = Math.min(10, Math.round(healthScore / 10));
  const receivableTrend = Math.min(10, Math.round(receivable > payable ? 6 : 3));

  const topOverdue = finance
    .filter((r) => (r.record_type || "").toLowerCase().includes("receivable"))
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

  return apiSuccess({
    sales: {
      totalLeads: salesMetrics.totalLeads,
      won: salesMetrics.won,
      active: salesMetrics.active,
      lost: salesMetrics.lost,
      pendingFollowups: followupsToday,
      dormantLeads: salesMetrics.dormantLeads,
    },
    operations,
    finance: {
      receivable,
      payable,
      freeCash,
      healthScore,
      receivableLabel: formatCr(receivable),
      payableLabel: formatCr(payable),
      freeCashLabel: formatCr(freeCash),
      queueCount: finance.length,
    },
    trends: {
      salesTrend,
      collectionTrend,
      profitTrend,
      receivableTrend,
    },
    alerts: {
      freeCashWarning:
        freeCash < 100_000
          ? `Free Cash sirf ${formatCr(freeCash)} — collections tez karo!`
          : null,
      topOverdueParty: topOverdue?.party_name
        ? `${topOverdue.party_name} — ${formatCr(Number(topOverdue.amount || 0))}`
        : null,
    },
  });
}
