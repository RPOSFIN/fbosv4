"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

export default function FBOSSettingsPage() {
  const [dbStatus, setDbStatus] = useState("Checking database...");

  useEffect(() => {
    apiFetch<{ ok: boolean; missing: Array<{ table: string; error?: string }> }>(
      "/api/health/database"
    )
      .then((data) => {
        if (data.ok) {
          setDbStatus("All FBOS tables verified.");
          return;
        }
        setDbStatus(
          `Missing: ${data.missing.map((m) => m.table).join(", ")}. Run supabase/migrations/001_phase2_complete.sql`
        );
      })
      .catch((e) => setDbStatus(e.message));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">FBOS Settings</h1>
      <p className="text-sm text-amber-300 mb-6">{dbStatus}</p>

      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        <Link href="/login" className="border rounded-xl p-5 hover:border-cyan-400">
          Authentication
        </Link>
        <Link href="/integrations" className="border rounded-xl p-5 hover:border-cyan-400">
          Integration Hub
        </Link>
        <Link href="/google-test" className="border rounded-xl p-5 hover:border-cyan-400">
          Google Sync Test
        </Link>
        <Link href="/imports" className="border rounded-xl p-5 hover:border-cyan-400">
          Data Import
        </Link>
        <Link href="/profile" className="border rounded-xl p-5 hover:border-cyan-400">
          User Profile
        </Link>
        <Link href="/admin" className="border rounded-xl p-5 hover:border-cyan-400">
          Role Management
        </Link>
      </div>
    </div>
  );
}
