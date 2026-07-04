import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCommercialTallyMetrics } from "@/lib/tally/canonical/commercial-sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const result = await getCommercialTallyMetrics({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!result.ok) return apiError(result.error || "Unable to load Tally metrics", 500);
  return apiSuccess(result);
}
