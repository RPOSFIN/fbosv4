"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

export default function LeadsPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;

  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [mobile, setMobile] = useState("");
  const [leads, setLeads] = useState<
    Array<{
      id: string;
      company_name: string;
      contact_person?: string;
      mobile?: string;
    }>
  >([]);

  const canCreate = role ? hasPermission(role, "leads", "create") : false;

  async function loadLeads() {
    const data = await apiFetch<typeof leads>("/api/leads");
    setLeads(data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<typeof leads>("/api/leads");
        if (active) setLeads(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function saveLead() {
    await apiFetch("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        company_name: company,
        contact_person: contact,
        mobile: mobile,
      }),
    });

    setCompany("");
    setContact("");
    setMobile("");
    await loadLeads();
    alert("Lead Saved");
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Lead Master</h1>
      <p className="mb-6">Total Leads : {leads.length}</p>

      {canCreate && (
        <div className="border border-cyan-500 rounded-xl p-6 max-w-xl">
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
            placeholder="Mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <button
            onClick={saveLead}
            className="bg-cyan-600 px-5 py-2 rounded"
          >
            Save Lead
          </button>
        </div>
      )}

      <div className="mt-8">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Company</th>
              <th className="border p-2">Contact</th>
              <th className="border p-2">Mobile</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="border p-2">{lead.company_name}</td>
                <td className="border p-2">{lead.contact_person}</td>
                <td className="border p-2">{lead.mobile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
