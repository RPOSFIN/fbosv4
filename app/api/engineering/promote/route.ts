import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { promoteLatestManual } from "@/lib/engineering/promotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Manual fallback: promote the latest ECP to 3R. Enforces the same safety gates
 * as automatic mode — refuses if any verification gate fails (Phase 4 + Phase 7).
 */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  try {
    const origin = new URL(request.url).origin;
    const result = await promoteLatestManual(origin);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Promotion failed", 500);
  }
}
