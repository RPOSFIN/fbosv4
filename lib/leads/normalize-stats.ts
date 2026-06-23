export type NormalizedLeadStats = {
  total: number;
  unique: number;
  duplicates: number;
  won: number;
  lost: number;
  active: number;
  statusBreakdown: Record<string, number>;
  topSources: Array<{ name: string; count: number }>;
  recentLeads: Array<{
    id: string;
    company_name: string;
    status: string;
    source: string;
    created_at: string;
  }>;
};

type RawLeadStats = {
  total?: number;
  unique?: number;
  duplicates?: number;
  won?: number;
  lost?: number;
  active?: number;
  statusBreakdown?: Record<string, number>;
  sourceBreakdown?: Record<string, number>;
  topSources?: Array<{ name: string; count: number }>;
  recentLeads?: NormalizedLeadStats["recentLeads"];
  data?: RawLeadStats;
};

function topSourcesFromBreakdown(
  sourceBreakdown: Record<string, number> | undefined
): Array<{ name: string; count: number }> {
  if (!sourceBreakdown) return [];
  return Object.entries(sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

/** Normalize /api/leads/stats payload (RPC or admin) for UI consumption. */
export function normalizeLeadStats(payload: unknown): NormalizedLeadStats | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = ((payload as RawLeadStats).data ?? payload) as RawLeadStats;
  const total = raw.total ?? 0;
  const unique = raw.unique ?? total;
  const won = raw.won ?? 0;
  const lost = raw.lost ?? 0;

  const topSources =
    raw.topSources?.length ? raw.topSources : topSourcesFromBreakdown(raw.sourceBreakdown);

  return {
    total,
    unique,
    duplicates: raw.duplicates ?? Math.max(0, total - unique),
    won,
    lost,
    active: raw.active ?? Math.max(0, total - won - lost),
    statusBreakdown: raw.statusBreakdown ?? {},
    topSources,
    recentLeads: raw.recentLeads ?? [],
  };
}
