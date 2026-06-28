import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { listChatTasks } from "@/lib/chat/task-store";

export async function GET() {
  const auth = await authorize("activity_logs", "read");
  if ("error" in auth) return auth.error;
  return apiSuccess({ tasks: listChatTasks() });
}

export async function PATCH(request: Request) {
  const auth = await authorize("activity_logs", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = body.status as "open" | "done" | undefined;
  if (!id || !status) return apiError("id and status required", 400);

  const tasks = listChatTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return apiError("Task not found", 404);
  task.status = status;
  return apiSuccess(task);
}
