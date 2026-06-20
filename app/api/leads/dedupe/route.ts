import { apiSuccess, authorize, writeActivityLog } from "@/lib/rbac/api-auth";
import { dedupeLeads } from "@/lib/leads/dedupe";

export async function GET() {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  return apiSuccess({ status: "ok", endpoint: "/api/leads/dedupe" });
}

export async function POST() {
  const auth = await authorize("leads", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const result = await dedupeLeads();

  await writeActivityLog({
    entity_type: "lead",
    entity_id: "dedupe",
    action: "dedupe",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: `Removed ${result.removed} duplicate(s)`,
  });

  return apiSuccess({
    message: `Removed ${result.removed} duplicate(s). ${result.totalBefore} → ${result.totalAfter} leads.`,
    ...result,
  });
}
