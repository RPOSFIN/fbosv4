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
};

type TaskRow = {
  external_id: string | null;
  name: string | null;
  status: string | null;
};

function normalizeName(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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
      .select("id, company_name, status, clickup_task_id", { count: "exact" })
      .limit(5000),
    supabase
      .from("clickup_tasks")
      .select("external_id, name, status", { count: "exact" })
      .limit(5000),
  ]);

  if (leadError) return apiError(leadError.message, 500);
  if (taskError) return apiError(taskError.message, 500);

  const leads = (leadRows || []) as LeadRow[];
  const tasks = (taskRows || []) as TaskRow[];

  const tasksById = new Map<string, TaskRow>();
  const tasksByName = new Map<string, TaskRow>();
  const leadsByName = new Map<string, LeadRow>();

  for (const task of tasks) {
    if (task.external_id) tasksById.set(task.external_id, task);
    const taskName = normalizeName(task.name);
    if (taskName && !tasksByName.has(taskName)) tasksByName.set(taskName, task);
  }

  for (const lead of leads) {
    const leadName = normalizeName(lead.company_name);
    if (leadName && !leadsByName.has(leadName)) leadsByName.set(leadName, lead);
  }

  const missingClickUpTask = leads
    .filter((lead) => !lead.clickup_task_id && !tasksByName.has(normalizeName(lead.company_name)))
    .slice(0, limit);

  const missingSupabaseLead = tasks
    .filter((task) => !leadsByName.has(normalizeName(task.name)))
    .slice(0, limit);

  const statusMismatches = leads
    .map((lead) => {
      const task = lead.clickup_task_id ? tasksById.get(lead.clickup_task_id) : tasksByName.get(normalizeName(lead.company_name));
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
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, limit);

  const byNormalizedStatus: Record<string, number> = {};
  const byClickUpStatus: Record<string, number> = {};
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
      missing_clickup_task_sample_count: missingClickUpTask.length,
      missing_supabase_lead_sample_count: missingSupabaseLead.length,
      status_mismatch_sample_count: statusMismatches.length,
    },
    byClickUpStatus,
    byNormalizedStatus,
    taskFieldAudit: {
      missing_assignee: 0,
      missing_due_date: 0,
      missing_priority: 0,
      missing_tags: 0,
      missing_custom_fields: 0,
    },
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
