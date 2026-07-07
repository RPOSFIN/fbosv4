import { FinanceDashboard } from "@/components/financeos/dashboard";
import { getFinanceDashboardRuntime } from "@/lib/financeos/live-data";

export default async function FinanceWorkbench() {
  const data = await getFinanceDashboardRuntime();
  return <FinanceDashboard data={data} />;
}
