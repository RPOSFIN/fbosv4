import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { verifyLatest } from "@/lib/engineering/promotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Run the Verification Gate Engine on the latest ECP and, when automation is on
 * and all gates PASS, auto-promote it to 3R. Never promotes on any gate FAIL.
 */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  try {
    const origin = new URL(request.url).origin;
    const result = await verifyLatest(origin);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Verification failed", 500);
  }
}
