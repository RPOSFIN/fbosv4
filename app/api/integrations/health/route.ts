import { NextResponse } from "next/server";
import { authorize } from "@/lib/rbac/api-auth";
import { getIntegrationStatuses } from "@/lib/integrations/status";
import { loadIntegrationSyncData } from "@/lib/integrations/sync-data";
import { getDashboardStatus } from "@/lib/dashboard/status";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  const [statuses, syncData, dashboard] = await Promise.all([
    getIntegrationStatuses(),
    loadIntegrationSyncData(),
    getDashboardStatus(),
  ]);

  const connectors: Record<
    string,
    {
      label: string;
      status: string;
      lastSyncAt: string | null;
      demo?: boolean;
      message?: string | null;
    }
  > = {};

  for (const rec of statuses) {
    connectors[rec.connector_name] = {
      label: String(rec.config?.label ?? rec.connector_name),
      status: rec.status,
      lastSyncAt: rec.last_sync_at,
      demo: rec.demo,
      message: rec.error_message,
    };
  }

  connectors.supabase = {
    label: "Supabase",
    status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "connected" : "error",
    lastSyncAt: null,
    demo: false,
    message: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? null
      : "NEXT_PUBLIC_SUPABASE_URL is not configured",
  };

  return NextResponse.json({
    ok: true,
    connectors,
    syncData,
    counts: dashboard.counts,
    finance: dashboard.finance,
    tables: syncData.tables ?? {},
    source: syncData.source ?? "supabase",
  });
}
