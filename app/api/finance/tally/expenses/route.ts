import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCanonicalExpenses } from "@/lib/tally/canonical/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const result = await getCanonicalExpenses({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    party: url.searchParams.get("party"),
    ledger: url.searchParams.get("ledger"),
  });

  if (!result.ok) return apiError(result.error || "Unable to load canonical Tally expenses", 500);
  return apiSuccess(result);
}
