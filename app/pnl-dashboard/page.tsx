import FinanceQueueView from "@/components/finance/FinanceQueueView";

export default function PnlDashboard() {
  return (
    <FinanceQueueView
      title="P&L Dashboard"
      showSummary
      subtitle="Summary by record type from synced sheet data"
    />
  );
}
