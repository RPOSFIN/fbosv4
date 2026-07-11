"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";

const TYPE_LABELS: Record<string, string> = {
  sops: "SOP Library",
  checklists: "Checklist Library",
  "route-maps": "Route Maps",
  affirmations: "Affirmations",
};

export default function KnowledgeTypePage() {
  const params = useParams();
  const type = String(params.type || "");
  const label = TYPE_LABELS[type] || type;

  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!TYPE_LABELS[type]) {
      setLoading(false);
      setError("Unknown knowledge type");
      return;
    }
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Record<string, unknown>[]>(
          `/api/knowledge/${type}`
        );
        if (active) {
          setItems(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [type]);

  if (!TYPE_LABELS[type]) {
    return (
      <div className="p-8">
        <p className="text-red-400">Invalid knowledge section.</p>
        <Link href="/knowledge-hub" className="text-cyan-400 text-sm mt-2 inline-block">
          ← Back to Knowledge Center
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link href="/knowledge-hub" className="text-sm text-cyan-400 hover:underline">
        ← Knowledge Center
      </Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{label}</h1>
      <p className="text-slate-400 text-sm mb-6">
        {items.length} item{items.length === 1 ? "" : "s"} from Supabase
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400">
          No {label.toLowerCase()} entries yet. Add content via Supabase or API.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={String(item.id)}
              className="border border-slate-800 rounded-xl p-4 bg-slate-900/40"
            >
              <h2 className="font-medium text-slate-100">
                {String(item.title || item.name || item.id || "Untitled")}
              </h2>
              {item.description != null && (
                <p className="text-sm text-slate-400 mt-1">
                  {String(item.description)}
                </p>
              )}
              {item.content != null && (
                <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                  {String(item.content).slice(0, 400)}
                  {String(item.content).length > 400 ? "…" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
