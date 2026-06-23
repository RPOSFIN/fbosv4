/** @deprecated Import from `@/lib/services/lead-service` instead */
export {
  getLeads as fetchLeadsPage,
  getLeadStats as fetchLeadStats,
  getLeadSalesMetrics as fetchLeadSalesMetrics,
  getLeads,
  getLeadStats,
  getWonLeads,
  getActiveLeads,
  getDormantLeads,
  getLeadSalesMetrics,
  type LeadRow,
  type LeadSalesMetrics,
  type LeadStats,
  type LeadsPageResult,
  type GetLeadsInput,
} from "@/lib/services/lead-service";

import { getLeads } from "@/lib/services/lead-service";

export async function fetchAllLeadStatuses(): Promise<Array<{ status: string | null }>> {
  const page = await getLeads({ page: 1, limit: 200 });
  return page.leads.map((lead) => ({ status: lead.status || null }));
}
