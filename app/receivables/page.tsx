import FinanceQueueView from "@/components/finance/FinanceQueueView";

export default function Receivables() {
  return (
    <FinanceQueueView
      title="Receivables"
      recordType="receivable"
      subtitle="Outstanding receivables from FBOS Master sheet (Tally export)"
    />
  );
}
