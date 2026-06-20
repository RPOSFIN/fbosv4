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

export type FinanceSyncRow = {
  id: string;
  company: string | null;
  voucher_no: string | null;
  voucher_type: string | null;
  amount: number;
  sync_status: string;
  created_at: string | null;
};

export type IntegrationSyncData = {
  tasks?: ClickUpTaskRow[];
  clickupTasks?: ClickUpTaskRow[];
  clickupTaskCount?: number;
  financeRecordCount?: number;
  lastSyncAt?: string;
  tables?: {
    clickup_tasks?: ClickUpTaskRow[];
    finance_transactions?: FinanceSyncRow[];
    finance_import_queue?: FinanceSyncRow[];
    integrations?: boolean;
    sheet_sync_log?: boolean;
    lead_history?: boolean;
    jobs?: boolean;
    leads?: boolean;
    [key: string]: unknown;
  };
  source?: string;
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
      tables: {},
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

  const { data: financeRows, count: financeCount } = await supabase
    .from("finance_import_queue")
    .select("id, company, voucher_no, voucher_type, amount, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(100);

  const financeRecords: FinanceSyncRow[] = (financeRows || []).map((r) => ({
    id: String(r.id),
    company: r.company ?? null,
    voucher_no: r.voucher_no ?? null,
    voucher_type: r.voucher_type ?? null,
    amount: Number(r.amount ?? 0),
    sync_status: String(r.status ?? "queued"),
    created_at: r.created_at ?? null,
  }));

  const tableChecks = await Promise.all([
    supabase.from("integrations").select("id", { head: true, count: "exact" }),
    supabase.from("sheet_sync_log").select("id", { head: true, count: "exact" }),
    supabase.from("lead_history").select("id", { head: true, count: "exact" }),
    supabase.from("jobs").select("id", { head: true, count: "exact" }),
    supabase.from("leads").select("id", { head: true, count: "exact" }),
  ]);

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

  const tables: IntegrationSyncData["tables"] = {
    clickup_tasks: clickupTasks,
    finance_transactions: financeRecords,
    finance_import_queue: financeRecords,
  };

  if (!tableChecks[0].error) tables.integrations = true;
  if (!tableChecks[1].error) tables.sheet_sync_log = true;
  if (!tableChecks[2].error) tables.lead_history = true;
  if (!tableChecks[3].error) tables.jobs = true;
  if (!tableChecks[4].error) tables.leads = true;

  return {
    tasks: clickupTasks,
    clickupTasks,
    clickupTaskCount: clickupTasks.length,
    financeRecordCount: financeCount ?? financeRecords.length,
    lastSyncAt: lastSyncAt ?? undefined,
    source: "supabase",
    tables,
  };
}
