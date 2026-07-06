import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { countTodayFollowups } from "@/lib/followups/fetch";

function formatCr(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

type FinanceHead = {
  head_key: string;
  row_count: number | null;
  amount: number | string | null;
  qc_status: string | null;
};

function headAmount(heads: Map<string, FinanceHead>, key: string) {
  const parsed = Number(heads.get(key)?.amount || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const [leadsRes, jobsRes, headsRes, followupsToday] = await Promise.all([
    supabase.from("leads").select("status", { count: "exact" }),
    supabase.from("jobs").select("status, dispatch_status, invoice_status", { count: "exact" }),
    supabase.from("finance_heads_v2").select("head_key, row_count, amount, qc_status"),
    countTodayFollowups(supabase).catch(() => 0),
  ]);

  if (headsRes.error) return apiError(headsRes.error.message, 500);

  const leads = leadsRes.data || [];
  const jobs = jobsRes.data || [];
  const heads = new Map<string, FinanceHead>();
  for (const row of (headsRes.data || []) as FinanceHead[]) heads.set(row.head_key, row);

  const won = leads.filter((l) => String(l.status || "").toUpperCase() === "WON").length;
  const lost = leads.filter((l) => String(l.status || "").toUpperCase() === "LOST").length;
  const active = leads.length - won - lost;

  const dispatched = jobs.filter((j) => String(j.dispatch_status || j.status || "").toUpperCase().includes("DISPATCH")).length;
  const inProduction = jobs.filter((j) => String(j.status || "").toUpperCase().includes("PRODUCTION")).length;
  const pending = jobs.filter((j) => ["PENDING", "CREATED", "OPEN"].some((s) => String(j.status || "").toUpperCase().includes(s))).length;

  const receivable = headAmount(heads, "receivables");
  const payable = headAmount(heads, "payables");
  const freeCash = headAmount(heads, "bank_cash");
  const sales = headAmount(heads, "sales");
  const purchase = headAmount(heads, "purchase");
  const collections = headAmount(heads, "receipts");
  const profit = headAmount(heads, "profit_loss") || sales - purchase;

  const healthScore = Math.min(100, Math.max(0, Math.round(
    (won / Math.max(leads.length, 1)) * 20 +
    (dispatched / Math.max(jobs.length, 1)) * 20 +
    (freeCash > 0 ? 20 : 5) +
    (profit > 0 ? 25 : 5) +
    (sales > purchase ? 15 : 5)
  )));

  const salesTrend = Math.min(10, Math.round((sales / Math.max(sales + payable, 1)) * 10));
  const collectionTrend = Math.min(10, Math.round((collections / Math.max(sales, 1)) * 10));
  const profitTrend = Math.min(10, Math.max(0, Math.round((profit / Math.max(sales, 1)) * 10)));
  const receivableTrend = Math.min(10, Math.round((receivable / Math.max(receivable + payable, 1)) * 10));

  return apiSuccess({
    sales: { totalLeads: leadsRes.count ?? leads.length, won, active, lost, pendingFollowups: followupsToday, dormantLeads: 0 },
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
      queueCount: headsRes.data?.length || 0,
      source: "finance_heads_v2",
    },
    trends: { salesTrend, collectionTrend, profitTrend, receivableTrend },
    alerts: {
      freeCashWarning: freeCash < 100000 ? `Free Cash ${formatCr(freeCash)}` : null,
      topOverdueParty: null,
    },
  });
}
