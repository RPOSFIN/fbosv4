"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

type Route = {
  employee: string;
  slots: { time: string; task: string }[];
  updated_at: string;
};

export default function RouteStatusPanel() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    apiFetch<{ routes: Route[] }>("/api/execution/routes")
      .then((res) => setRoutes(res.routes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (routes.length <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % routes.length), 8000);
    return () => clearInterval(t);
  }, [routes.length]);

  const current = routes[activeIdx];
  const taskCount = current?.slots?.length ?? 0;

  return (
    <Link
      href="/execution-board"
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-blue-600 font-bold">Active Route</p>
          <p className="text-xl font-bold text-slate-900 mt-1 truncate">
            {current?.employee ?? "— Select Employee —"}
          </p>
        </div>
        <div className="text-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shrink-0">
          <p className="text-3xl font-black text-amber-700">{taskCount}</p>
          <p className="text-[10px] uppercase text-amber-800 font-semibold">Tasks</p>
        </div>
      </div>
      {current?.slots?.[0] && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">Next · {current.slots[0].time}</p>
          <p className="text-[15px] text-slate-800 mt-0.5 font-medium line-clamp-2">
            {current.slots[0].task}
          </p>
        </div>
      )}
      {current?.updated_at && (
        <p className="text-xs text-slate-400 mt-2">
          Synced {new Date(current.updated_at).toLocaleString("en-IN")}
        </p>
      )}
    </Link>
  );
}
