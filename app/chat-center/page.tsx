"use client";

import { useEffect, useRef, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import { apiFetch } from "@/lib/api/client";
import { pageShell } from "@/components/command-center/theme";

type ChatMessage = {
  id: string;
  entity_type: string;
  action: string;
  user_name: string | null;
  notes: string | null;
  created_at: string | null;
};

type ChatTask = {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  status: "open" | "done";
};

export default function ChatCenterPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<ChatTask[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    const [chat, taskRes] = await Promise.all([
      apiFetch<{ messages: ChatMessage[]; mode?: string }>("/api/chat"),
      apiFetch<{ tasks: ChatTask[] }>("/api/chat/tasks"),
    ]);
    setMessages(chat.messages || []);
    setMode(chat.mode || "");
    setTasks(taskRes.tasks || []);
  }

  useEffect(() => {
    loadAll()
      .catch(console.error)
      .finally(() => setLoading(false));
    const t = setInterval(() => loadAll().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setText("");
      await loadAll();
    } finally {
      setSending(false);
    }
  }

  async function toggleTask(id: string, status: "open" | "done") {
    await apiFetch("/api/chat/tasks", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    await loadAll();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <CommandHeader title="Internal Chat" badge={mode === "memory" ? "LOCAL MODE (SESSION)" : "LIVE"} />
      <div className={`flex-1 ${pageShell} grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0 pb-5`}>
        <div className="lg:col-span-2 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] bg-slate-50">
            {loading ? (
              <p className="text-slate-500">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-slate-500 text-center py-16">
                No messages yet. Pehla message bhejo!
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 max-w-[90%] ${
                    m.entity_type === "chat_message"
                      ? "bg-white border border-slate-200"
                      : "bg-blue-50 border border-blue-100 text-sm"
                  }`}
                >
                  <div className="flex gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">
                      {m.user_name || "Team"}
                    </span>
                    {m.created_at && (
                      <span>{new Date(m.created_at).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">
                    {m.notes || m.action}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message likho… (@task ya #task lagao to task banega)"
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="px-4 pb-3 text-xs text-amber-700">
            💡 Tip: message me <code className="bg-amber-100 px-1 rounded">#task</code> ya{" "}
            <code className="bg-amber-100 px-1 rounded">@task</code> likho — Task List me chala
            jayega
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b bg-emerald-50">
            <h2 className="font-bold text-emerald-900 text-sm">✅ CHAT-TO-TASK LIST</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No tasks yet. Chat me #task use karo.
              </p>
            ) : (
              tasks.map((t) => (
                <label
                  key={t.id}
                  className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={() =>
                      toggleTask(t.id, t.status === "done" ? "open" : "done")
                    }
                    className="mt-1"
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        t.status === "done" ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.created_by} · {new Date(t.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
