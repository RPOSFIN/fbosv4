import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { buildDerivedBalanceSheet } from "@/lib/tally/canonical/balance-sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const report = await buildDerivedBalanceSheet();
  return apiSuccess(report);
}
