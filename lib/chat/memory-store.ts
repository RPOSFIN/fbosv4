export type ChatEntry = {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  user_id?: string | null;
  user_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

const memoryMessages: ChatEntry[] = [];

export function listMemoryChat(): ChatEntry[] {
  return [...memoryMessages].sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
}

export function addMemoryChat(entry: Omit<ChatEntry, "id" | "created_at">): ChatEntry {
  const row: ChatEntry = {
    ...entry,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  memoryMessages.unshift(row);
  if (memoryMessages.length > 200) memoryMessages.length = 200;
  return row;
}
