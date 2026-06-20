import { NextResponse } from "next/server";
import { authorize } from "@/lib/rbac/api-auth";
import { getIntegrationStatuses } from "@/lib/integrations/status";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  const statuses = await getIntegrationStatuses();
  const connectors: Record<
    string,
    { label: string; status: string; lastSyncAt: string | null; demo?: boolean }
  > = {};

  for (const rec of statuses) {
    connectors[rec.connector_name] = {
      label: String(rec.config?.label ?? rec.connector_name),
      status: rec.status,
      lastSyncAt: rec.last_sync_at,
      demo: rec.demo,
    };
  }

  return NextResponse.json({ ok: true, connectors });
}
