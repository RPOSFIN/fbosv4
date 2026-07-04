import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCanonicalTallyMetrics } from "@/lib/tally/canonical/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const result = await getCanonicalTallyMetrics({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!result.ok) return apiError(result.error || "Unable to load canonical Tally summary", 500);
  return apiSuccess(result);
}
