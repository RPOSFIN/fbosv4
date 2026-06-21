import { getClickUpConfig } from "@/lib/integrations/config";
import { syncClickUpTasksToLeads, type ClickUpLeadTask } from "@/lib/integrations/clickup-leads";
import { CLICKUP_DEMO } from "@/lib/integrations/demo-data";
import { getAdminClient } from "@/lib/supabase/admin";

export type ClickUpSyncResult = {
  ok: boolean;
  demo: boolean;
  teams?: Array<{ id: string; name: string }>;
  spaces?: Array<{ id: string; name: string }>;
  lists?: Array<{ id: string; name: string; space_id?: string }>;
  tasks?: ClickUpLeadTask[];
  tasksStored?: number;
  leadsImported?: number;
  leadsUpdated?: number;
  leadsSkipped?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  leadsSynced?: number;
  message: string;
};

async function storeClickUpTasks(
  tasks: Array<{
    id: string;
    name: string;
    status?: string;
    team_id?: string;
    team_name?: string;
    space_id?: string;
    space_name?: string;
    list_id?: string;
    list_name?: string;
    raw?: unknown;
  }>
): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !tasks.length) return 0;

  const dedicatedPayload = tasks.map((t) => ({
    external_id: t.id,
    name: t.name,
    status: t.status || null,
    team_id: t.team_id || null,
    team_name: t.team_name || null,
    space_id: t.space_id || null,
    space_name: t.space_name || null,
    list_id: t.list_id || null,
    list_name: t.list_name || null,
    raw: t.raw || {},
    synced_at: new Date().toISOString(),
  }));

  const { data: dedicatedData, error: dedicatedErr } = await supabase
    .from("clickup_tasks")
    .upsert(dedicatedPayload, { onConflict: "external_id" })
    .select("id");

  if (!dedicatedErr && (dedicatedData?.length || 0) > 0) {
    return dedicatedData!.length;
  }

  if (dedicatedErr) {
    console.warn("[clickup] dedicated table:", dedicatedErr.message);
  }

  const fallbackPayload = tasks.map((t) => ({
    task_title: `[ClickUp] ${t.name}`,
    related_entity: "clickup",
    status: t.status || "Pending",
    priority: "Medium",
  }));

  const { data: inserted, error: fallbackErr } = await supabase
    .from("tasks")
    .insert(fallbackPayload)
    .select("id");

  if (fallbackErr) {
    console.warn("[clickup] store tasks:", fallbackErr.message);
    return 0;
  }

  return inserted?.length || 0;
}

/** Populate clickup_tasks from leads that already have clickup_task_id (Apps Script / prior sync path). */
export async function backfillClickUpTasksFromLeads(): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase) return 0;

  const { data: leads, error } = await supabase
    .from("leads")
    .select("clickup_task_id, company_name, status, source")
    .not("clickup_task_id", "is", null);

  if (error || !leads?.length) return 0;

  const payload = leads
    .filter((l) => l.clickup_task_id?.trim())
    .map((l) => ({
      external_id: String(l.clickup_task_id).trim(),
      name: String(l.company_name || "ClickUp task"),
      status: l.status || null,
      list_name: l.source === "ClickUp" ? "Lead CRM" : null,
      synced_at: new Date().toISOString(),
    }));

  if (!payload.length) return 0;

  const { data, error: upsertErr } = await supabase
    .from("clickup_tasks")
    .upsert(payload, { onConflict: "external_id" })
    .select("id");

  if (upsertErr) {
    console.warn("[clickup] backfill from leads:", upsertErr.message);
    return 0;
  }

  return data?.length || 0;
}

export async function syncClickUpDemo(): Promise<ClickUpSyncResult> {
  const tasks = CLICKUP_DEMO.tasks.map((t) => {
    const list = CLICKUP_DEMO.lists.find((l) => l.id === t.list_id);
    const space = CLICKUP_DEMO.spaces.find((s) => s.id === list?.space_id);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      team_id: CLICKUP_DEMO.teams[0]?.id,
      team_name: CLICKUP_DEMO.teams[0]?.name,
      space_id: space?.id,
      space_name: space?.name,
      list_id: list?.id,
      list_name: list?.name,
      raw: t,
    };
  });

  const tasksStored = await storeClickUpTasks(tasks);
  const leadResult = await syncClickUpTasksToLeads(CLICKUP_DEMO.tasks);
  const backfilled = tasksStored === 0 ? await backfillClickUpTasksFromLeads() : 0;

  return {
    ok: true,
    demo: true,
    teams: CLICKUP_DEMO.teams,
    spaces: CLICKUP_DEMO.spaces,
    lists: CLICKUP_DEMO.lists,
    tasks: CLICKUP_DEMO.tasks,
    tasksStored: tasksStored || backfilled,
    leadsImported: leadResult.leadsImported,
    leadsUpdated: leadResult.leadsUpdated,
    leadsSkipped: leadResult.leadsSkipped,
    leadsSynced: leadResult.leadsImported + leadResult.leadsUpdated,
    message: `Demo mode — ${CLICKUP_DEMO.tasks.length} sample task(s)${tasksStored ? `, ${tasksStored} stored` : ""}${leadResult.leadsImported || leadResult.leadsUpdated ? `, leads: ${leadResult.leadsImported} inserted, ${leadResult.leadsUpdated} updated` : ""}`,
  };
}


type ClickUpListRef = { id: string; name: string; space_id?: string };

async function fetchClickUpListsFromFolder(
  token: string,
  folderId: string
): Promise<ClickUpListRef[]> {
  const listsRes = await fetch(
    `https://api.clickup.com/api/v2/folder/${folderId}/list?archived=false`,
    { headers: { Authorization: token } }
  );
  if (!listsRes.ok) return [];
  const listsData = (await listsRes.json()) as {
    lists?: Array<{ id: string; name: string; space?: { id: string } }>;
  };
  return (listsData.lists || []).map((list) => ({
    id: list.id,
    name: list.name,
    space_id: list.space?.id,
  }));
}

async function fetchClickUpTasksForList(
  token: string,
  list: ClickUpListRef,
  ctx: {
    teamId: string;
    teamName?: string;
    spaceName?: string;
  },
  storePayload: Parameters<typeof storeClickUpTasks>[0],
  allTasks: ClickUpLeadTask[]
): Promise<void> {
  let page = 0;
  let tasksData: {
    tasks?: Array<{
      id: string;
      name: string;
      status?: { status: string };
      assignees?: Array<{ username?: string; email?: string }>;
      priority?: { priority?: string };
      due_date?: string | null;
      date_created?: string;
      custom_fields?: Array<{ name?: string; value?: unknown }>;
    }>;
  };

  do {
    const pageRes = await fetch(
      `https://api.clickup.com/api/v2/list/${list.id}/task?archived=false&page=${page}&include_closed=true&subtasks=true`,
      { headers: { Authorization: token } }
    );
    if (!pageRes.ok) {
      console.warn(
        `[clickup] list ${list.id} page ${page} failed: HTTP ${pageRes.status}`
      );
      break;
    }
    tasksData = (await pageRes.json()) as typeof tasksData;
    const batch = tasksData.tasks || [];
    if (!batch.length) break;

    for (const t of batch) {
      const parsed = parseClickUpLeadTask(t);
      allTasks.push(parsed);
      storePayload.push({
        id: t.id,
        name: t.name,
        status: t.status?.status,
        team_id: ctx.teamId,
        team_name: ctx.teamName,
        space_id: list.space_id,
        space_name: ctx.spaceName,
        list_id: list.id,
        list_name: list.name,
        raw: t,
      });
    }
    page += 1;
  } while ((tasksData.tasks?.length ?? 0) >= 100);
}

function getClickUpCustomField(
  fields: Array<{ name?: string; value?: unknown }> | undefined,
  names: string[]
): string {
  if (!fields?.length) return "";
  for (const f of fields) {
    const n = String(f.name || "").toLowerCase();
    if (!names.some((want) => n.includes(want))) continue;
    const v = f.value;
    if (v == null || v === "") continue;
    if (typeof v === "object" && v !== null && "value" in (v as object)) {
      return String((v as { value?: unknown }).value ?? "").trim();
    }
    return String(v).trim();
  }
  return "";
}

function formatClickUpMs(ms?: string | null): string {
  if (!ms) return "";
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString().slice(0, 10);
}

function parseClickUpLeadTask(t: {
  id: string;
  name: string;
  status?: { status: string };
  assignees?: Array<{ username?: string; email?: string }>;
  priority?: { priority?: string };
  due_date?: string | null;
  date_created?: string;
  custom_fields?: Array<{ name?: string; value?: unknown }>;
}): ClickUpLeadTask {
  const followUp =
    formatClickUpMs(t.due_date) ||
    getClickUpCustomField(t.custom_fields, [
      "next follow-up",
      "follow-up",
      "followup",
    ]);
  return {
    id: t.id,
    name: t.name,
    status: t.status?.status,
    mobile: getClickUpCustomField(t.custom_fields, ["mobile", "phone"]),
    assignee:
      t.assignees?.[0]?.username?.trim() ||
      t.assignees?.[0]?.email?.trim() ||
      "",
    priority: t.priority?.priority || "",
    due_date: followUp,
    comments: "",
    start_date: formatClickUpMs(t.date_created),
  };
}

export async function syncClickUp(): Promise<ClickUpSyncResult> {
  const { configured } = getClickUpConfig();
  if (!configured) {
    return syncClickUpDemo();
  }

  const token = process.env.CLICKUP_API_TOKEN!.trim();
  const teamId = process.env.CLICKUP_TEAM_ID?.trim();

  const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
    headers: { Authorization: token },
  });

  if (!teamsRes.ok) {
    const body = await teamsRes.text();
    if (teamsRes.status === 401 || body.includes("Token invalid") || body.includes("OAUTH_025")) {
      const demo = await syncClickUpDemo();
      return {
        ...demo,
        message: `ClickUp token invalid — running demo data. Update CLICKUP_API_TOKEN in .env.local. (${body.slice(0, 80)})`,
      };
    }
    return {
      ok: false,
      demo: false,
      message: `ClickUp API error (${teamsRes.status}): ${body.slice(0, 200)}`,
    };
  }

  const teamsData = (await teamsRes.json()) as {
    teams?: Array<{ id: string; name: string }>;
  };
  const teams = teamsData.teams || [];
  const resolvedTeamId = teamId || teams[0]?.id;

  if (!resolvedTeamId) {
    return {
      ok: true,
      demo: false,
      teams,
      message: "ClickUp connected — no teams found",
    };
  }

  const teamName = teams.find((t) => t.id === resolvedTeamId)?.name;

  const spacesRes = await fetch(
    `https://api.clickup.com/api/v2/team/${resolvedTeamId}/space?archived=false`,
    { headers: { Authorization: token } }
  );

  if (!spacesRes.ok) {
    const body = await spacesRes.text();
    return {
      ok: false,
      demo: false,
      teams,
      message: `ClickUp spaces error (${spacesRes.status}): ${body.slice(0, 200)}`,
    };
  }

  const spacesData = (await spacesRes.json()) as {
    spaces?: Array<{ id: string; name: string }>;
  };
  const allSpaces = spacesData.spaces || [];
  const spaceIdFilter = process.env.CLICKUP_SPACE_ID?.trim();
  const folderIdFilter = process.env.CLICKUP_FOLDER_ID?.trim();
  const listIdFilter = process.env.CLICKUP_LIST_ID?.trim();

  const spaces = spaceIdFilter
    ? allSpaces.filter((s) => s.id === spaceIdFilter)
    : allSpaces;

  const allTasks: ClickUpLeadTask[] = [];
  const storePayload: Parameters<typeof storeClickUpTasks>[0] = [];
  const lists: ClickUpSyncResult["lists"] = [];

  const taskCtx = {
    teamId: resolvedTeamId,
    teamName,
  };

  if (listIdFilter) {
    const listRes = await fetch(
      `https://api.clickup.com/api/v2/list/${listIdFilter}`,
      { headers: { Authorization: token } }
    );

    if (!listRes.ok) {
      const body = await listRes.text();
      return {
        ok: false,
        demo: false,
        teams,
        spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
        message: `ClickUp list error (${listRes.status}): ${body.slice(0, 200)}`,
      };
    }

    const listData = (await listRes.json()) as {
      id: string;
      name: string;
      space?: { id: string; name: string };
    };

    const listRef: ClickUpListRef = {
      id: listData.id,
      name: listData.name,
      space_id: listData.space?.id,
    };

    if (
      spaceIdFilter &&
      listRef.space_id &&
      listRef.space_id !== spaceIdFilter
    ) {
      return {
        ok: false,
        demo: false,
        teams,
        message: "CLICKUP_LIST_ID is not in CLICKUP_SPACE_ID",
      };
    }

    lists.push({
      id: listRef.id,
      name: listRef.name,
      space_id: listRef.space_id,
    });

    await fetchClickUpTasksForList(
      token,
      listRef,
      {
        ...taskCtx,
        spaceName: listData.space?.name,
      },
      storePayload,
      allTasks
    );
  } else if (folderIdFilter) {
    const folderLists = await fetchClickUpListsFromFolder(token, folderIdFilter);
    const scopedLists = spaceIdFilter
      ? folderLists.filter((l) => l.space_id === spaceIdFilter)
      : folderLists;

    for (const list of scopedLists) {
      lists.push(list);
      const spaceName = spaces.find((s) => s.id === list.space_id)?.name;
      await fetchClickUpTasksForList(
        token,
        list,
        { ...taskCtx, spaceName },
        storePayload,
        allTasks
      );
    }
  } else {
    const spaceLimit = spaceIdFilter
      ? spaces.length
      : Number(process.env.CLICKUP_SPACE_LIMIT || "10");
    for (const space of spaces.slice(0, spaceLimit)) {
      const listsRes = await fetch(
        `https://api.clickup.com/api/v2/space/${space.id}/list?archived=false`,
        { headers: { Authorization: token } }
      );

      if (!listsRes.ok) continue;

      const listsData = (await listsRes.json()) as {
        lists?: Array<{ id: string; name: string }>;
      };

      const listLimit = spaceIdFilter
        ? (listsData.lists || []).length
        : Number(process.env.CLICKUP_LIST_LIMIT || "5");
      const listSlice = (listsData.lists || []).slice(0, listLimit);

      for (const list of listSlice) {
        lists.push({ id: list.id, name: list.name, space_id: space.id });
        await fetchClickUpTasksForList(
          token,
          { id: list.id, name: list.name, space_id: space.id },
          { ...taskCtx, spaceName: space.name },
          storePayload,
          allTasks
        );
      }
    }
  }

  let tasksStored = await storeClickUpTasks(storePayload);
  const leadResult = await syncClickUpTasksToLeads(allTasks);

  if (tasksStored === 0) {
    tasksStored = await backfillClickUpTasksFromLeads();
  }

  const leadParts: string[] = [];
  if (leadResult.leadsImported) leadParts.push(`${leadResult.leadsImported} inserted`);
  if (leadResult.leadsUpdated) leadParts.push(`${leadResult.leadsUpdated} updated`);
  if (leadResult.leadsSkipped) leadParts.push(`${leadResult.leadsSkipped} skipped`);
  const leadMsg = leadParts.length ? ` — leads: ${leadParts.join(", ")}` : "";

  return {
    ok: true,
    demo: false,
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
    lists,
    tasks: allTasks.slice(0, 20),
    tasksStored,
    leadsImported: leadResult.leadsImported,
    leadsUpdated: leadResult.leadsUpdated,
    leadsSkipped: leadResult.leadsSkipped,
    inserted: leadResult.inserted,
    updated: leadResult.updated,
    skipped: leadResult.skipped,
    leadsSynced: leadResult.leadsImported + leadResult.leadsUpdated,
    message: `Synced ${teams.length} team(s), ${lists.length} list(s), ${allTasks.length} task(s)${tasksStored ? ` — ${tasksStored} stored` : ""}${leadMsg}`,
  };
}
