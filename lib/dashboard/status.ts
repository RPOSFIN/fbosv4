import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";

export type DashboardStatus = {
  counts: {
    leads: number;
    followups: number;
    quotations: number;
    clients: number;
    jobs: number;
    clickup_tasks: number;
    finance_import_queue: number;
  };
  finance: {
    sales: number;
    collections: number;
    expenses: number;
    receivable: number;
    payable: number;
    freeCash: number;
    badDebts: number;
    overdueAmount: number;
    overdueParties: number;
    emergencyFund: number;
    reserveFund: number;
    overdueCollections: number;
  };
  integrations: Record<
    string,
    {
      status?: string;
      lastSyncAt?: string | null;
      errorMessage?: string | null;
      config?: Record<string, unknown>;
    }
  >;
};

export const EMPTY_DASHBOARD_STATUS: DashboardStatus = {
  counts: {
    leads: 0,
    followups: 0,
    quotations: 0,
    clients: 0,
    jobs: 0,
    clickup_tasks: 0,
    finance_import_queue: 0,
  },
  finance: {
    sales: 0,
    collections: 0,
    expenses: 0,
    receivable: 0,
    payable: 0,
    freeCash: 0,
    badDebts: 0,
    overdueAmount: 0,
    overdueParties: 0,
    emergencyFund: 0,
    reserveFund: 0,
    overdueCollections: 0,
  },
  integrations: {},
};

function getAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDashboardStatus(raw: unknown): DashboardStatus {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const counts =
    obj.counts && typeof obj.counts === "object"
      ? (obj.counts as Record<string, unknown>)
      : {};
  const finance =
    obj.finance && typeof obj.finance === "object"
      ? (obj.finance as Record<string, unknown>)
      : {};
  const integrations =
    obj.integrations && typeof obj.integrations === "object"
      ? (obj.integrations as DashboardStatus["integrations"])
      : {};

  return {
    counts: {
      leads: toNumber(counts.leads),
      followups: toNumber(counts.followups),
      quotations: toNumber(counts.quotations),
      clients: toNumber(counts.clients),
      jobs: toNumber(counts.jobs),
      clickup_tasks: toNumber(counts.clickup_tasks),
      finance_import_queue: toNumber(counts.finance_import_queue),
    },
    finance: {
      sales: toNumber(finance.sales),
      collections: toNumber(finance.collections),
      expenses: toNumber(finance.expenses),
      receivable: toNumber(finance.receivable),
      payable: toNumber(finance.payable),
      freeCash: toNumber(finance.freeCash),
      badDebts: toNumber(finance.badDebts),
      overdueAmount: toNumber(finance.overdueAmount),
      overdueParties: toNumber(finance.overdueParties),
      emergencyFund: toNumber(finance.emergencyFund),
      reserveFund: toNumber(finance.reserveFund),
      overdueCollections: toNumber(finance.overdueCollections),
    },
    integrations,
  };
}

export async function getDashboardStatus(): Promise<DashboardStatus> {
  const client = getAdminClient() || getAnonClient();
  if (!client) return EMPTY_DASHBOARD_STATUS;

  const { data, error } = await client.rpc("get_fbos_dashboard_status");
  if (error) {
    console.warn("[dashboard/status] RPC failed:", error.message);
    return EMPTY_DASHBOARD_STATUS;
  }

  return normalizeDashboardStatus(data);
}

