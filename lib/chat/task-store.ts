export type ChatTask = {
  id: string;
  title: string;
  source_message: string;
  created_by: string;
  created_at: string;
  status: "open" | "done";
};

const tasks: ChatTask[] = [];

export function parseTaskFromMessage(message: string): string | null {
  const hash = message.match(/#task\s+(.+)/i);
  if (hash?.[1]) return hash[1].trim();
  const at = message.match(/@task\s+(.+)/i);
  if (at?.[1]) return at[1].trim();
  return null;
}

export function addChatTask(input: {
  title: string;
  source_message: string;
  created_by: string;
}): ChatTask {
  const task: ChatTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    source_message: input.source_message,
    created_by: input.created_by,
    created_at: new Date().toISOString(),
    status: "open",
  };
  tasks.unshift(task);
  if (tasks.length > 100) tasks.length = 100;
  return task;
}

export function listChatTasks(): ChatTask[] {
  return [...tasks];
}
