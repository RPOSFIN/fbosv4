import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { syncCanonicalTally } from "@/lib/tally/canonical/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await syncCanonicalTally({
    from: typeof body.from === "string" ? body.from : null,
    to: typeof body.to === "string" ? body.to : null,
    reports: Array.isArray(body.reports)
      ? body.reports.filter((item): item is string => typeof item === "string")
      : typeof body.report === "string"
        ? body.report
        : typeof body.reports === "string"
          ? body.reports
          : null,
    party: typeof body.party === "string" ? body.party : null,
    ledger: typeof body.ledger === "string" ? body.ledger : null,
  });

  if (!result.ok) return apiError(result.errors[0]?.issue?.toString() || "Canonical Tally sync failed", 502);
  return apiSuccess(result);
}
