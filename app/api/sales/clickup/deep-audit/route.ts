import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { normalizeClickUpSalesStatus } from "@/lib/integrations/clickup-leads";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  company_name: string | null;
  status: string | null;
  clickup_task_id: string | null;
  updated_at: string | null;
};

type ClickUpRow = {
  id: string;
  external_id: string | null;
  name: string | null;
  status: string | null;
  list_name: string | null;
  space_name: string | null;
  synced_at: string | null;
  raw?: Record<string, any> | null;
};

function key(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function pickRaw(raw: any, keys: string[]) {
  if (!raw || typeof raw !== "object") return null;
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const [{ data: leadRows, error: leadError, count: leadCount }, { data: taskRows, error: taskError, count: taskCount }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, company_name, status, clickup_task_id, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("clickup_tasks")
      .select("id, external_id, name, status, list_name, space_name, synced_at, raw", { count: "exact" })
      .order("synced_at", { ascending: false })
      .limit(5000),
  ]);

  if (leadError) return apiError(leadError.message, 500);
  if (taskError) return apiError(taskError.message, 500);

  const leads = (leadRows || []) as LeadRow[];
  const tasks = (taskRows || []) as ClickUpRow[];
  const tasksByExternalId = new Map(tasks.filter((t) => t.external_id).map((t) => [t.external_id as string, t]));
  const tasksByName = new Map(tasks.map((t) => [key(t.name), t]).filter(([name]) => name));
  const leadsByCompany = new Map(leads.map((lead) => [key(lead.company_name), lead]).filter(([name]) => name));

  const allMissingClickUpTask = leads.filter((lead) => !lead.clickup_task_id && !tasksByName.has(key(lead.company_name)));
  const allMissingSupabaseLead = tasks.filter((task) => !leadsByCompany.has(key(task.name)));

  const allStatusMismatches = leads
    .map((lead) => {
      const task = lead.clickup_task_id ? tasksByExternalId.get(lead.clickup_task_id) : tasksByName.get(key(lead.company_name));
      if (!task) return null;
      const clickupStatus = normalizeClickUpSalesStatus(task.status || undefined);
      const crmStatus = String(lead.status || "").toUpperCase();
      if (!crmStatus || crmStatus === clickupStatus) return null;
      return {
        lead_id: lead.id,
        company_name: lead.company_name,
        crm_status: crmStatus,
        clickup_task_id: task.external_id,
        clickup_name: task.name,
        clickup_status_raw: task.status,
        clickup_status_normalized: clickupStatus,
      };
    })
    .filter(Boolean);

  const missingClickUpTask = allMissingClickUpTask.slice(0, limit);
  const missingSupabaseLead = allMissingSupabaseLead.slice(0, limit);
  const statusMismatches = allStatusMismatches.slice(0, limit);

  const taskFieldAudit = tasks.reduce(
    (acc, task) => {
      const raw = task.raw || {};
      if (!pickRaw(raw, ["assignees", "assignee", "assignee_id"])) acc.missing_assignee += 1;
      if (!pickRaw(raw, ["due_date", "dueDate"])) acc.missing_due_date += 1;
      if (!pickRaw(raw, ["priority"])) acc.missing_priority += 1;
      if (!pickRaw(raw, ["tags"])) acc.missing_tags += 1;
      if (!pickRaw(raw, ["custom_fields", "customFields"])) acc.missing_custom_fields += 1;
      return acc;
    },
    {
      missing_assignee: 0,
      missing_due_date: 0,
      missing_priority: 0,
      missing_tags: 0,
      missing_custom_fields: 0,
    }
  );

  const byClickUpStatus: Record<string, number> = {};
  const byNormalizedStatus: Record<string, number> = {};
  for (const task of tasks) {
    const rawStatus = task.status || "unknown";
    const normalized = normalizeClickUpSalesStatus(task.status || undefined);
    byClickUpStatus[rawStatus] = (byClickUpStatus[rawStatus] || 0) + 1;
    byNormalizedStatus[normalized] = (byNormalizedStatus[normalized] || 0) + 1;
  }

  return apiSuccess({
    summary: {
      supabase_leads: leadCount ?? leads.length,
      clickup_tasks: taskCount ?? tasks.length,
      sampled_leads: leads.length,
      sampled_clickup_tasks: tasks.length,
      missing_clickup_task_sample_count: allMissingClickUpTask.length,
      missing_supabase_lead_sample_count: allMissingSupabaseLead.length,
      status_mismatch_sample_count: allStatusMismatches.length,
    },
    byClickUpStatus,
    byNormalizedStatus,
    taskFieldAudit,
    samples: {
      missing_clickup_task: missingClickUpTask,
      missing_supabase_lead: missingSupabaseLead,
      status_mismatches: statusMismatches,
    },
    rules: {
      supabase: "source_of_truth",
      clickup: "execution_mirror_only",
      direct_clickup_to_leads_write: false,
    },
  });
}
