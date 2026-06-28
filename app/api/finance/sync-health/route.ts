import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getFinanceSyncHealth } from "@/lib/finance/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Finance/Tally sync health — never hides pending or failed records. */
export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  return apiSuccess(await getFinanceSyncHealth());
}
