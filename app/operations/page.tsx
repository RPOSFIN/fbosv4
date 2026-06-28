"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommandHeader from "@/components/command-center/command-header";
import MetricCard from "@/components/command-center/metric-card";
import UploadZone from "@/components/command-center/upload-zone";
import { apiFetch } from "@/lib/api/client";
import { pageShell } from "@/components/command-center/theme";

type Job = {
  id: string;
  job_no: string;
  status: string;
  client_name: string | null;
  created_at: string;
};

export default function OperationsLivePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, dispatched: 0, inProduction: 0, pending: 0 });

  useEffect(() => {
    apiFetch<{ jobs: Job[]; count: number }>("/api/jobs?limit=100")
      .then((res) => {
        const rows = res.jobs || [];
        setJobs(rows);
        setCount(res.count ?? rows.length);
        const dispatched = rows.filter((j) =>
          String(j.status).toUpperCase().includes("DISPATCH")
        ).length;
        const inProduction = rows.filter((j) =>
          String(j.status).toUpperCase().includes("PRODUCTION")
        ).length;
        const pending = rows.filter((j) =>
          ["PENDING", "CREATED", "OPEN"].some((s) =>
            String(j.status).toUpperCase().includes(s)
          )
        ).length;
        setStats({
          total: res.count ?? rows.length,
          dispatched,
          inProduction: inProduction || Math.max(0, rows.length - dispatched - pending),
          pending,
        });
      })
      .catch(console.error);
  }, []);

  function statusClass(s: string) {
    const u = s.toUpperCase();
    if (u.includes("DISPATCH") || u.includes("DONE") || u.includes("COMPLETE"))
      return "text-emerald-700 font-bold";
    if (u.includes("HOLD") || u.includes("DELAY")) return "text-red-700 font-bold";
    if (u.includes("PRODUCTION") || u.includes("PRINT")) return "text-blue-700 font-bold";
    return "text-amber-700 font-bold";
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Operations (Live)" />
      <div className={`${pageShell} space-y-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Orders" value={stats.total} sub="Order Master" accent="blue" />
          <MetricCard label="Dispatched" value={stats.dispatched} sub="Complete" accent="green" />
          <MetricCard label="In Production" value={stats.inProduction} sub="Vendor to pass" accent="orange" />
          <MetricCard label="Pending" value={stats.pending} sub="Action needed" accent="purple" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-900 text-[15px]">LIVE ORDERS FROM MASTER SHEET</h2>
            <div className="flex items-center gap-3">
              <Link href="/compliance" className="text-sm text-blue-700 hover:underline font-medium">
                Vendor Check →
              </Link>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                LIVE · {count}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Order ID</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Production</th>
                  <th className="text-left p-3">Dispatch</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      No orders — run Sync from header
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono text-sm font-semibold text-blue-800">{j.job_no}</td>
                      <td className="p-3 text-slate-900">{j.client_name || "—"}</td>
                      <td className={`p-3 ${statusClass(j.status)}`}>{j.status}</td>
                      <td className={`p-3 ${statusClass(j.status)}`}>
                        {j.status.toUpperCase().includes("PRODUCTION") ? "IN PROGRESS" : "—"}
                      </td>
                      <td className={`p-3 ${statusClass(j.status)}`}>
                        {j.status.toUpperCase().includes("DISPATCH") ? "DISPATCHED" : "PENDING"}
                      </td>
                      <td className="p-3 text-slate-500 text-sm">
                        {new Date(j.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <UploadZone
          label="Upload Order Master CSV"
          hint="Tab: 02_Order_Master from FBOS MASTER V1"
          accept=".csv"
        />
      </div>
    </div>
  );
}
