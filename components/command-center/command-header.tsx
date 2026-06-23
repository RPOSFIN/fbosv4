"use client";

import Link from "next/link";
import SyncToolbar from "./sync-toolbar";
import { heading, muted } from "./theme";

type Props = {
  title: string;
  badge?: string;
};

export default function CommandHeader({ title, badge }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-5 lg:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <h1 className={heading}>{title}</h1>
          {badge && <p className={`${muted} mt-0.5 text-xs uppercase tracking-wide font-semibold text-blue-600`}>{badge}</p>}
        </div>
        <SyncToolbar />
      </div>
    </header>
  );
}

/** Optional AI link row — not duplicated with sync */
export function HeaderTools() {
  return (
    <div className="flex gap-2">
      <Link
        href="/ai"
        className="text-sm font-medium text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
      >
        ✦ AI Search
      </Link>
    </div>
  );
}
