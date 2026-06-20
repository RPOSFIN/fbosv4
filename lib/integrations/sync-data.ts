import { getAdminClient } from "@/lib/supabase/admin";

export interface ClickUpTaskRow {
  id: string;
  external_id: string;
  name: string;
  status: string | null;
  list_name: string | null;
  space_name: string | null;
  synced_at: string | null;
}

export type IntegrationSyncData = {
  // Existing fields
  tasks?: ClickUpTaskRow[];
  clickupTasks?: ClickUpTaskRow[];
  clickupTaskCount?: number;
  financeRecordCount?: number;
  lastSyncAt?: string;

  // Table payloads (UI reads arrays from here)
  tables?: {
    clickup_tasks?: ClickUpTaskRow[];
    finance_transactions?: Array<Record<string, unknown>>;
    finance_import_queue?: boolean;
    sheet_sync_log?: boolean;
    lead_history?: boolean;
    [key: string]: unknown;
  };

  // Source tracking per connector
  source?: string | {
    clickup?: string;
    tally?: string;
    gsheet?: string;
    apps_script?: string;
    [key: string]: string | undefined;
  };

  syncStatus?: string;
  lastError?: string;
  [key: string]: unknown;
};

export async function loadIntegrationSyncData(): Promise<IntegrationSyncData> {
  const supabase = getAdminClient();
  if (!supabase) {
    return {
      clickupTasks: [],
      clickupTaskCount: 0,
      financeRecordCount: 0,
      source: "unknown",
    };
  }

  const { data: tasks } = await supabase
    .from("clickup_tasks")
    .select("id, external_id, name, status, list_name, space_name, synced_at")
    .order("synced_at", { ascending: false })
    .limit(100);

  const clickupTasks: ClickUpTaskRow[] = (tasks || []).map((t) => ({
    id: String(t.id),
    external_id: String(t.external_id),
    name: String(t.name),
    status: t.status ?? null,
    list_name: t.list_name ?? null,
    space_name: t.space_name ?? null,
    synced_at: t.synced_at ?? null,
  }));

  const { count: financeCount } = await supabase
    .from("finance_import_queue")
    .select("*", { count: "exact", head: true });

  const { data: intRows } = await supabase
    .from("integrations")
    .select("connector_name, last_sync_at")
    .in("connector_name", ["clickup", "gsheet", "tally"]);

  const lastSyncAt =
    intRows
      ?.map((r) => r.last_sync_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? undefined;

  return {
    tasks: clickupTasks,
    clickupTasks,
    clickupTaskCount: clickupTasks.length,
    financeRecordCount: financeCount ?? 0,
    lastSyncAt: lastSyncAt ?? undefined,
    source: "supabase",
    tables: {
      clickup_tasks: clickupTasks,
      finance_transactions: [],
    },
  };
}