import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCommercialTallyVouchers } from "@/lib/tally/canonical/commercial-sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const result = await getCommercialTallyVouchers({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    report: url.searchParams.get("report"),
    party: url.searchParams.get("party"),
    ledger: url.searchParams.get("ledger"),
    voucherType: url.searchParams.get("voucherType"),
  });

  if (!result.ok) return apiError(result.error || "Unable to load Tally vouchers", 500);
  return apiSuccess(result);
}
