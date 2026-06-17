"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";
import type {
  FollowupBucket,
  TodayFollowupItem,
  TodayFollowupsResponse,
} from "@/lib/followups/query";

export default function TodaysFollowupPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canUpdate = role ? hasPermission(role, "followups", "update") : false;

  const [data, setData] = useState<TodayFollowupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<TodayFollowupsResponse>("/api/followups/today");
      setData(result);
      setActionMsg(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to load followups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone(id: string) {
    if (!canUpdate) return;
    await apiFetch(`/api/followups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Completed" }),
    });
    setActionMsg("Followup marked as done");
    await load();
  }

  async function submitReschedule(id: string) {
    if (!canUpdate || !rescheduleDate) return;
    await apiFetch(`/api/followups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ next_followup: rescheduleDate, status: "Pending" }),
    });
    setRescheduleId(null);
    setRescheduleDate("");
    setActionMsg("Followup rescheduled");
    await load();
  }

  const counts = data?.counts ?? { overdue: 0, today: 0, backlog: 0, total: 0 };
  const items = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Today&apos;s Followup</h1>
          <p className="mt-2 text-slate-400">
            Overdue + today + undated backlog — pending items carry forward until done
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/sales-workbench" className="text-cyan-400 hover:text-cyan-300">
            ← Sales Workbench
          </Link>
          <Link href="/followups" className="text-slate-400 hover:text-slate-300">
            Followup Center
          </Link>
        </div>
      </div>

      {actionMsg && (
        <p className="mb-4 text-sm border border-cyan-800/50 bg-cyan-950/20 text-cyan-200 rounded-lg px-4 py-2">
          {actionMsg}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CountBadge label="Overdue" value={counts.overdue} tone="red" />
        <CountBadge label="Due Today" value={counts.today} tone="cyan" />
        <CountBadge label="No Date Backlog" value={counts.backlog} tone="amber" />
        <CountBadge label="Total Accumulated" value={counts.total} tone="white" />
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 text-sm text-slate-400 flex justify-between">
          <span>
            {loading
              ? "Loading…"
              : `${counts.total} pending followup(s) as of ${data?.date ?? "today"}`}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2">Lead / Company</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Last Contact</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <FollowupRowItem
                  key={row.id}
                  row={row}
                  canUpdate={canUpdate}
                  rescheduleId={rescheduleId}
                  rescheduleDate={rescheduleDate}
                  onMarkDone={markDone}
                  onStartReschedule={(id) => {
                    setRescheduleId(id);
                    setRescheduleDate(row.next_followup || "");
                  }}
                  onCancelReschedule={() => {
                    setRescheduleId(null);
                    setRescheduleDate("");
                  }}
                  onRescheduleDateChange={setRescheduleDate}
                  onSubmitReschedule={submitReschedule}
                />
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No pending followups for today. You&apos;re all caught up!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FollowupRowItem({
  row,
  canUpdate,
  rescheduleId,
  rescheduleDate,
  onMarkDone,
  onStartReschedule,
  onCancelReschedule,
  onRescheduleDateChange,
  onSubmitReschedule,
}: {
  row: TodayFollowupItem;
  canUpdate: boolean;
  rescheduleId: string | null;
  rescheduleDate: string;
  onMarkDone: (id: string) => void;
  onStartReschedule: (id: string) => void;
  onCancelReschedule: () => void;
  onRescheduleDateChange: (date: string) => void;
  onSubmitReschedule: (id: string) => void;
}) {
  const leadHref = row.lead_id
    ? `/lead-master?search=${encodeURIComponent(row.lead_name)}`
    : `/lead-master?search=${encodeURIComponent(row.company_name || row.lead_name)}`;

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/30">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-200">{row.lead_name}</div>
        {row.contact_person && (
          <div className="text-xs text-slate-500">{row.contact_person}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <BucketBadge bucket={row.bucket} status={row.status} />
      </td>
      <td className="px-4 py-3 text-slate-300">
        {row.next_followup || <span className="text-amber-400">No date</span>}
      </td>
      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
        {row.notes || "—"}
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">
        {row.last_contact
          ? new Date(row.last_contact).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-4 py-3">
        {rescheduleId === row.id ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => onRescheduleDateChange(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            />
            <button
              onClick={() => onSubmitReschedule(row.id)}
              className="rounded bg-cyan-700 px-2 py-1 text-xs hover:bg-cyan-600"
            >
              Save
            </button>
            <button
              onClick={onCancelReschedule}
              className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <>
                <button
                  onClick={() => onMarkDone(row.id)}
                  className="rounded-lg bg-green-800 px-2 py-1 text-xs hover:bg-green-700"
                >
                  Done
                </button>
                <button
                  onClick={() => onStartReschedule(row.id)}
                  className="rounded-lg border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                >
                  Reschedule
                </button>
              </>
            )}
            <Link
              href={leadHref}
              className="rounded-lg border border-cyan-700/50 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-950/40"
            >
              Open Lead
            </Link>
          </div>
        )}
      </td>
    </tr>
  );
}

function CountBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "cyan" | "amber" | "white";
}) {
  const colors = {
    red: "text-red-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    white: "text-white",
  };
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function BucketBadge({
  bucket,
  status,
}: {
  bucket: FollowupBucket;
  status?: string | null;
}) {
  const bucketStyles: Record<FollowupBucket, string> = {
    overdue: "border-red-500/40 text-red-300 bg-red-950/20",
    today: "border-cyan-500/40 text-cyan-300 bg-cyan-950/20",
    backlog: "border-amber-500/40 text-amber-300 bg-amber-950/20",
  };
  const bucketLabels: Record<FollowupBucket, string> = {
    overdue: "Overdue",
    today: "Today",
    backlog: "Backlog",
  };
  return (
    <div className="space-y-1">
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-xs ${bucketStyles[bucket]}`}
      >
        {bucketLabels[bucket]}
      </span>
      {status && status !== "Pending" && (
        <div className="text-xs text-slate-500">{status}</div>
      )}
    </div>
  );
}
