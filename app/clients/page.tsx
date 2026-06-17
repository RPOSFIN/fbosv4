"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

type Client = { id: string; company_name: string };

export default function ClientsPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canCreateJob = role ? hasPermission(role, "jobs", "create") : false;

  const [clients, setClients] = useState<Client[]>([]);

  async function createJob(client: Client) {
    await apiFetch(`/api/clients/${client.id}/jobs`, { method: "POST" });
    alert("Job Created");
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Client[]>("/api/clients");
        if (active) setClients(data);
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
      <h1 className="text-3xl font-bold mb-6">Client Master</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Company</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td className="border p-2">{client.company_name}</td>
              <td className="border p-2">
                {canCreateJob && (
                  <button
                    className="bg-purple-600 px-3 py-1 rounded"
                    onClick={() => createJob(client)}
                  >
                    Create Job
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
