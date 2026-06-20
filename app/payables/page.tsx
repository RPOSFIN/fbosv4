import FinanceQueueView from "@/components/finance/FinanceQueueView";

export default function Payables() {
  return (
    <FinanceQueueView
      title="Payables"
      recordType="payable"
      subtitle="Outstanding payables from FBOS Master sheet (Tally export)"
    />
  );
}
