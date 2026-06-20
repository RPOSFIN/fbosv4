"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

export default function KnowledgeHubPage() {
  const [health, setHealth] = useState<string>("");

  useEffect(() => {
    apiFetch<{ ok: boolean; missing: Array<{ table: string }> }>(
      "/api/health/database"
    )
      .then((data) =>
        setHealth(
          data.ok
            ? "Database architecture verified"
            : `Missing tables: ${data.missing.map((m) => m.table).join(", ")}`
        )
      )
      .catch((e) => setHealth(e.message));
  }, []);

  const sections = [
    ["SOP Library", "/knowledge-hub/sops"],
    ["Checklist Library", "/knowledge-hub/checklists"],
    ["Route Maps", "/knowledge-hub/route-maps"],
    ["Affirmations", "/knowledge-hub/affirmations"],
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Knowledge Center</h1>
      <p className="text-sm text-slate-400 mb-6">{health}</p>

      <div className="grid grid-cols-4 gap-4">
        {sections.map(([name, href]) => (
          <Link
            key={name}
            href={href}
            className="border rounded-xl p-5 hover:border-cyan-400"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}
