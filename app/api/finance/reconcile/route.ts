import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { reconcileFinance } from "@/lib/finance/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Run the Finance Reconciliation Service (pending_tally → synced → verified). */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await reconcileFinance({ dryRun: Boolean(body?.dryRun) });
    if (!result.ok) return apiError(result.message, 503);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Reconcile failed", 500);
  }
}
