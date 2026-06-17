"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

const STAGES = [
  "NEW",
  "QUALIFIED",
  "REQUIREMENT",
  "QUOTATION",
  "NEGOTIATION",
  "WON",
  "LOST",
];

type Lead = {
  id: string;
  company_name: string;
  contact_person?: string;
  status?: string;
};

export default function SalesKanban() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canUpdate = role ? hasPermission(role, "leads", "update") : false;

  const [leads, setLeads] = useState<Lead[]>([]);

  async function loadLeads() {
    const data = await apiFetch<Lead[]>("/api/leads");
    setLeads(data);
  }

  async function updateStage(leadId: string, status: string) {
    await apiFetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadLeads();
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Live Sales Kanban</h1>

      <div className="grid grid-cols-7 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className="border rounded-xl p-3 min-h-[500px]">
            <h2 className="font-bold mb-3">{stage}</h2>

            {leads
              .filter((x) => (x.status || "NEW").toUpperCase() === stage)
              .map((lead) => (
                <div key={lead.id} className="border rounded p-2 mb-2">
                  <div>{lead.company_name}</div>
                  <div className="text-xs">{lead.contact_person}</div>
                  {canUpdate && (
                    <select
                      className="mt-2 w-full bg-slate-900 border text-xs p-1"
                      value={(lead.status || "NEW").toUpperCase()}
                      onChange={(e) => updateStage(lead.id, e.target.value)}
                    >
                      {STAGES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
