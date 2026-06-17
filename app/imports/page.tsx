"use client";

import { useState } from "react";
import Papa from "papaparse";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

export default function ImportPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canImport = role ? hasPermission(role, "imports", "create") : false;

  const [rows, setRows] = useState<
    Array<{ company_name?: string; contact_person?: string; mobile?: string }>
  >([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setRows(results.data as typeof rows);
      },
    });
  };

  const importData = async () => {
    const result = await apiFetch<{ imported: number }>("/api/imports/leads", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    alert(`Import Complete: ${result.imported} records`);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Lead Import Engine</h1>

      <input type="file" accept=".csv" onChange={handleFile} />

      <p className="mt-4">Records Loaded: {rows.length}</p>

      {canImport && (
        <button
          onClick={importData}
          className="bg-cyan-600 px-5 py-2 rounded mt-4"
          disabled={!rows.length}
        >
          Import Leads
        </button>
      )}

      <div className="mt-8 overflow-auto">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Company</th>
              <th className="border p-2">Contact</th>
              <th className="border p-2">Mobile</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.company_name}</td>
                <td className="border p-2">{r.contact_person}</td>
                <td className="border p-2">{r.mobile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
