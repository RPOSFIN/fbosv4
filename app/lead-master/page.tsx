"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";
import { pushLeadToGoogle } from "@/lib/google-write";

type Lead = {
  id: string;
  company_name: string;
  contact_person?: string;
  mobile?: string;
  status?: string;
};

export default function LeadMaster() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canDelete = role ? hasPermission(role, "leads", "delete") : false;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");

  async function loadLeads() {
    const data = await apiFetch<Lead[]>("/api/leads");
    setLeads(data);
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete Lead ?")) return;
    await apiFetch(`/api/leads/${id}`, { method: "DELETE" });
    await loadLeads();
  }

  async function syncLeadToGoogle(lead: Lead) {
    const data = await pushLeadToGoogle(lead);
    alert("Google Sync Success");
    console.log(data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Lead[]>("/api/leads");
        if (active) setLeads(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = leads.filter((x) =>
    (x.company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold">Lead Master</h1>

      <input
        className="mt-5 w-full max-w-md border p-2 bg-slate-900"
        placeholder="Search Company..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="w-full mt-6 border">
        <thead>
          <tr>
            <th className="border p-2">Company</th>
            <th className="border p-2">Contact</th>
            <th className="border p-2">Mobile</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((lead) => (
            <tr key={lead.id}>
              <td className="border p-2">{lead.company_name}</td>
              <td className="border p-2">{lead.contact_person}</td>
              <td className="border p-2">{lead.mobile}</td>
              <td className="border p-2">{lead.status || "NEW"}</td>
              <td className="border p-2">
                {canDelete && (
                  <button
                    className="bg-red-600 px-3 py-1 rounded mr-2"
                    onClick={() => deleteLead(lead.id)}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="bg-green-700 px-3 py-1 rounded"
                  onClick={() => syncLeadToGoogle(lead)}
                >
                  Google Sync
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
