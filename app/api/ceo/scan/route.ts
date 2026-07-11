import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { listChatTasks } from "@/lib/chat/task-store";
import { listRoutes } from "@/lib/execution/route-store";
import { getAdminClient } from "@/lib/supabase/admin";
import { countTodayFollowups } from "@/lib/followups/fetch";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const tasks = listChatTasks().filter((t) => t.status === "open");
  const routes = listRoutes().map((r) => ({
    employee: r.employee,
    slotCount: r.slots.length,
    nextTask: r.slots[0]?.task ?? null,
    nextTime: r.slots[0]?.time ?? null,
  }));

  let followupsToday = 0;
  let pendingOrders = 0;
  const supabase = getAdminClient();
  if (supabase) {
    try {
      followupsToday = await countTodayFollowups(supabase);
    } catch {
      followupsToday = 0;
    }
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true });
    pendingOrders =
      count ??
      0;
  }

  const summary = [
    `${tasks.length} open task(s)`,
    `${routes.length} employee route(s)`,
    `${followupsToday} followup(s) due today`,
    `${pendingOrders} pending order(s)`,
  ].join(" · ");

  return apiSuccess({
    generatedAt: new Date().toISOString(),
    pendingTasks: tasks.slice(0, 20),
    openTaskCount: tasks.length,
    routes,
    followupsToday,
    pendingOrders,
    summary,
  });
}
