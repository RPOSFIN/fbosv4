import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { countTodayFollowups } from "@/lib/followups/fetch";

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

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const [
    leadsRes,
    jobsRes,
    financeRes,
    followupsToday,
  ] = await Promise.all([
    supabase.from("leads").select("status", { count: "exact" }),
    supabase.from("jobs").select("status, dispatch_status, invoice_status", { count: "exact" }),
    supabase
      .from("finance_import_queue")
      .select("amount, record_type, party_name, voucher_date")
      .limit(2000),
    countTodayFollowups(supabase).catch(() => 0),
  ]);

  const leads = leadsRes.data || [];
  const jobs = jobsRes.data || [];
  const finance = financeRes.data || [];

  const won = leads.filter((l) => String(l.status || "").toUpperCase() === "WON").length;
  const lost = leads.filter((l) => String(l.status || "").toUpperCase() === "LOST").length;
  const active = leads.length - won - lost;

  const dispatched = jobs.filter((j) =>
    String(j.dispatch_status || j.status || "").toUpperCase().includes("DISPATCH")
  ).length;
  const inProduction = jobs.filter((j) =>
    String(j.status || "").toUpperCase().includes("PRODUCTION")
  ).length;
  const pending = jobs.filter((j) =>
    ["PENDING", "CREATED", "OPEN"].some((s) =>
      String(j.status || "").toUpperCase().includes(s)
    )
  ).length;

  const receivable = sumAmount(finance, "receivable");
  const payable = sumAmount(finance, "payable");
  const freeCash = Math.max(0, receivable - payable);
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (won / Math.max(leads.length, 1)) * 40 +
          (dispatched / Math.max(jobs.length, 1)) * 30 +
          (freeCash / Math.max(receivable, 1)) * 30
      )
    )
  );

  const salesTrend = Math.min(10, Math.round((won / Math.max(leads.length, 1)) * 10));
  const collectionTrend = Math.min(10, Math.round((freeCash / Math.max(receivable, 1)) * 10));
  const profitTrend = Math.min(10, Math.round(healthScore / 10));
  const receivableTrend = Math.min(10, Math.round((receivable > payable ? 6 : 3)));

  const topOverdue = finance
    .filter((r) => (r.record_type || "").toLowerCase().includes("receivable"))
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

  return apiSuccess({
    sales: {
      totalLeads: leadsRes.count ?? leads.length,
      won,
      active,
      lost,
      pendingFollowups: followupsToday,
      dormantLeads: 0,
    },
    operations: {
      totalOrders: jobsRes.count ?? jobs.length,
      dispatched,
      inProduction: inProduction || Math.max(0, jobs.length - dispatched - pending),
      pending,
      artworkPending: 0,
      dispatchDelayed: 0,
      overdueOrders: pending,
      highPriority: 0,
    },
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
