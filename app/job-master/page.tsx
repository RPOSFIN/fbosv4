"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

type JobRow = {
  id: string;
  job_no: string;
  status: string;
  client_name: string | null;
  product: string | null;
  quantity: number | null;
  amount: number;
  order_date: string | null;
  delivery_date: string | null;
  production_stage: string | null;
  designer: string | null;
};

export default function JobMaster() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ jobs: JobRow[]; count: number }>("/api/jobs?limit=100");
        setJobs(res.jobs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Job Master</h1>
        <Link href="/integrations" className="text-sm text-cyan-400 hover:underline">
          Sync from Google Sheet →
        </Link>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        Data from Google Sheet tab <strong>08_Operations_Jobs</strong> via Supabase sync.
      </p>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-400">
          No jobs yet. Import <code>02_Operations_Jobs.csv</code> to your sheet and run Sync GSheet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="text-left p-3">Job No</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Stage</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="p-3 font-medium">{j.job_no}</td>
                  <td className="p-3">{j.client_name || "—"}</td>
                  <td className="p-3">{j.product || "—"}</td>
                  <td className="p-3">{j.status}</td>
                  <td className="p-3">{j.production_stage || "—"}</td>
                  <td className="p-3 text-right">{j.quantity ?? "—"}</td>
                  <td className="p-3 text-right">{Number(j.amount || 0).toLocaleString("en-IN")}</td>
                  <td className="p-3">{j.delivery_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
