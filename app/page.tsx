"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommandHeader from "@/components/command-center/command-header";
import HorizontalClock from "@/components/command-center/horizontal-clock";
import RouteStatusPanel from "@/components/command-center/route-status-panel";
import AffirmationCarousel from "@/components/command-center/affirmation-carousel";
import MetricCard from "@/components/command-center/metric-card";
import { pageShell, panelPad } from "@/components/command-center/theme";
import { apiFetch } from "@/lib/api/client";
import { useRouteAlarm } from "@/hooks/use-route-alarm";

type CommandData = {
  sales: { totalLeads: number; won: number; pendingFollowups: number; dormantLeads: number };
  operations: { artworkPending: number; dispatchDelayed: number; overdueOrders: number; highPriority: number };
  finance: { receivableLabel: string; payableLabel: string; freeCashLabel: string; healthScore: number };
  alerts: { freeCashWarning: string | null };
};

type Route = { employee: string; slots: { time: string; task: string }[]; updated_at: string };

export default function Page() {
  const [data, setData] = useState<CommandData | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  useRouteAlarm(routes);

  useEffect(() => {
    Promise.all([
      apiFetch<CommandData>("/api/dashboard/command-center"),
      apiFetch<{ routes: Route[] }>("/api/execution/routes"),
    ])
      .then(([cmd, rt]) => {
        setData(cmd);
        setRoutes(rt.routes || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <CommandHeader title="CEO Master Dashboard" />
      <div className={`${pageShell} space-y-4 lg:space-y-5`}>
        <HorizontalClock />

        {data?.alerts?.freeCashWarning && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 text-[15px] font-medium">
            ⚠ {data.alerts.freeCashWarning}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4">
            <RouteStatusPanel />
          </div>
          <div className="xl:col-span-8">
            <AffirmationCarousel />
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-[15px]">Loading live data…</p>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <LivePanel title="Sales (Live)" href="/sales-workbench">
              <MetricCard label="Total Leads" value={data.sales.totalLeads} accent="blue" />
              <MetricCard label="WON" value={data.sales.won} accent="green" />
              <MetricCard label="Pending Followups" value={data.sales.pendingFollowups} accent="orange" />
              <MetricCard label="Dormant" value={data.sales.dormantLeads} />
            </LivePanel>
            <LivePanel title="Operations (Live)" href="/operations">
              <MetricCard label="Artwork Pending" value={data.operations.artworkPending} />
              <MetricCard label="Dispatch Delayed" value={data.operations.dispatchDelayed} accent="orange" />
              <MetricCard label="Overdue Orders" value={data.operations.overdueOrders} accent="red" />
              <MetricCard label="High Priority" value={data.operations.highPriority} accent="purple" />
            </LivePanel>
            <LivePanel title="Finance (Live)" href="/finance-dashboard">
              <MetricCard label="Receivable" value={data.finance.receivableLabel} accent="green" />
              <MetricCard label="Payable" value={data.finance.payableLabel} accent="orange" />
              <MetricCard label="Free Cash" value={data.finance.freeCashLabel} accent="blue" />
              <MetricCard label="Health" value={`${data.finance.healthScore}/100`} accent="purple" />
            </LivePanel>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink title="Quotation AI" href="/quotations" desc="AI quotes + WhatsApp" />
          <QuickLink title="Compliance Hub" href="/compliance" desc="Vendor rules · Observations · Errors" />
          <QuickLink title="Call Coach" href="/sales-workbench" desc="Recording + behaviour analysis" />
        </div>
      </div>
    </div>
  );
}

function LivePanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className={`${panelPad} space-y-3 h-full`}>
      <Link href={href} className="text-base font-bold text-blue-700 hover:text-blue-900">
        {title} →
      </Link>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function QuickLink({ title, href, desc }: { title: string; href: string; desc: string }) {
  return (
    <Link href={href} className={`${panelPad} block hover:border-blue-400 transition-colors`}>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </Link>
  );
}
