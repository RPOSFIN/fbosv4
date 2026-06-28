import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { rollbackBatch } from "@/lib/finance/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Roll back a reconciliation batch using its finance_sync_log snapshot. */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const batchId = String(body?.batchId || "").trim();
    if (!batchId) return apiError("batchId is required", 400);
    const result = await rollbackBatch(batchId);
    if (!result.ok) return apiError(result.message, 404);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Rollback failed", 500);
  }
}
