import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCommercialTallyReport } from "@/lib/tally/canonical/commercial-sales";
import { listTallyReportDefinitions } from "@/lib/tally/reports/definitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const result = await getCommercialTallyReport({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    report: url.searchParams.get("report"),
    party: url.searchParams.get("party"),
    ledger: url.searchParams.get("ledger"),
    voucherType: url.searchParams.get("voucherType"),
    status: url.searchParams.get("status"),
  });

  if (!result.ok) return apiError(result.error || "Unable to load canonical Tally report", 500);
  return apiSuccess({
    ...result,
    available_reports: listTallyReportDefinitions(),
  });
}
