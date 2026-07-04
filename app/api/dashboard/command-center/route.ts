import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { countTodayFollowups } from "@/lib/followups/fetch";
import { buildCanonicalFinanceSummary } from "@/lib/tally/formulas/canonical-finance";

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

  const [leadsRes, jobsRes, vouchersRes, linesRes, followupsToday] = await Promise.all([
    supabase.from("leads").select("status", { count: "exact" }),
    supabase.from("jobs").select("status, dispatch_status, invoice_status", { count: "exact" }),
    supabase
      .from("tally_vouchers")
      .select("id, voucher_no, voucher_type, reference, narration, amount, debit_total, credit_total, voucher_date, party_name, ledger_name")
      .gte("voucher_date", "2024-04-01")
      .limit(20000),
    supabase
      .from("tally_voucher_lines")
      .select("voucher_no, voucher_type, voucher_date, party_name, ledger_name, amount, debit, credit")
      .gte("voucher_date", "2024-04-01")
      .limit(40000),
    countTodayFollowups(supabase).catch(() => 0),
  ]);

  const leads = leadsRes.data || [];
  const jobs = jobsRes.data || [];
  const vouchers = vouchersRes.data || [];
  const lines = linesRes.data || [];

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

  const finance = buildCanonicalFinanceSummary(vouchers, lines);
  const receivable = Number(finance.receivables || 0);
  const payable = Number(finance.payables || 0);
  const freeCash = Number(finance.cashflow || 0);
  const sales = Number(finance.total_sales || 0);
  const collections = Number(finance.total_receipts || 0);
  const profit = Number(finance.net_profit || 0);
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (won / Math.max(leads.length, 1)) * 25 +
          (dispatched / Math.max(jobs.length, 1)) * 25 +
          (freeCash > 0 ? 25 : 5) +
          (profit > 0 ? 25 : 5)
      )
    )
  );

  const salesTrend = Math.min(10, Math.round((sales / Math.max(sales + payable, 1)) * 10));
  const collectionTrend = Math.min(10, Math.round((collections / Math.max(sales, 1)) * 10));
  const profitTrend = Math.min(10, Math.max(0, Math.round((profit / Math.max(sales, 1)) * 10)));
  const receivableTrend = Math.min(10, Math.round((receivable / Math.max(receivable + payable, 1)) * 10));

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
      queueCount: vouchers.length,
      source: "canonical_tally",
    },
    trends: {
      salesTrend,
      collectionTrend,
      profitTrend,
      receivableTrend,
    },
    alerts: {
      freeCashWarning: freeCash < 100_000 ? `Free Cash ${formatCr(freeCash)} — collections tez karo!` : null,
      topOverdueParty: null,
    },
  });
}
