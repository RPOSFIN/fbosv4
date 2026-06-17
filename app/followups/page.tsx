"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

type Followup = {
  id: string;
  company_name?: string;
  contact_person?: string;
  next_followup?: string;
  status?: string;
};

export default function FollowupsPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canCreate = role ? hasPermission(role, "followups", "create") : false;

  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [followups, setFollowups] = useState<Followup[]>([]);

  async function loadFollowups() {
    const data = await apiFetch<Followup[]>("/api/followups");
    setFollowups(data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Followup[]>("/api/followups");
        if (active) setFollowups(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function saveFollowup() {
    await apiFetch("/api/followups", {
      method: "POST",
      body: JSON.stringify({
        company_name: company,
        contact_person: contact,
        next_followup: nextFollowup || null,
      }),
    });

    setCompany("");
    setContact("");
    setNextFollowup("");
    await loadFollowups();
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Followup Center</h1>

      <div className="mb-6">
        <Link
          href="/followups/today"
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 px-4 py-2 text-sm text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/20"
        >
          Today&apos;s Followup (overdue + backlog) →
        </Link>
      </div>

      {canCreate && (
        <div className="border border-cyan-500 rounded-xl p-5 max-w-xl mb-8">
          <input
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <input
            placeholder="Contact Person"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <input
            type="date"
            value={nextFollowup}
            onChange={(e) => setNextFollowup(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <button
            onClick={saveFollowup}
            className="bg-cyan-600 px-5 py-2 rounded"
          >
            Save Followup
          </button>
        </div>
      )}

      <div className="border border-cyan-500 rounded-xl p-5">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Company</th>
              <th className="border p-2">Contact</th>
              <th className="border p-2">Next Followup</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((row) => (
              <tr key={row.id}>
                <td className="border p-2">{row.company_name}</td>
                <td className="border p-2">{row.contact_person}</td>
                <td className="border p-2">{row.next_followup || "-"}</td>
                <td className="border p-2">{row.status || "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
