import {
  apiError,
  apiSuccess,
  authorize,
} from "@/lib/rbac/api-auth";
import { addMemoryChat, listMemoryChat } from "@/lib/chat/memory-store";
import { addChatTask, parseTaskFromMessage } from "@/lib/chat/task-store";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await authorize("activity_logs", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) {
    const messages = listMemoryChat();
    return apiSuccess({ messages, count: messages.length, mode: "memory" });
  }

  const { data, error, count } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact" })
    .limit(1);

  if (!error) {
    const full = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (!full.error) {
      return apiSuccess({
        messages: full.data || [],
        count: count ?? full.data?.length ?? 0,
        mode: "database",
      });
    }
  }

  if (error?.code === "PGRST205" || error?.message?.includes("schema cache")) {
    const messages = listMemoryChat();
    return apiSuccess({ messages, count: messages.length, mode: "memory" });
  }
  if (error) return apiError(error.message, 500);

  return apiSuccess({ messages: [], count: 0, mode: "database" });
}

export async function POST(request: Request) {
  const auth = await authorize("activity_logs", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json().catch(() => ({}));
  const message = String(body.message || body.notes || "").trim();
  if (!message) return apiError("message is required", 400);

  const taskTitle = parseTaskFromMessage(message);
  let task = null;
  if (taskTitle) {
    task = addChatTask({
      title: taskTitle,
      source_message: message,
      created_by: ctx.fullName || ctx.email || "Team",
    });
  }

  const row = {
    entity_type: "chat_message",
    entity_id: null,
    action: "message",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email || "Team",
    notes: message,
  };

  const supabase = getAdminClient();
  if (!supabase) {
    const saved = addMemoryChat(row);
    return apiSuccess({ ...saved, task }, 201);
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .insert([row])
    .select("*")
    .single();

  if (error?.code === "PGRST205" || error?.message?.includes("schema cache")) {
    const saved = addMemoryChat(row);
    return apiSuccess({ ...saved, task }, 201);
  }
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ...data, task }, 201);
}
