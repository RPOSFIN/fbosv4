import FinanceQueueView from "@/components/finance/FinanceQueueView";

export default function CashflowPage() {
  return (
    <FinanceQueueView
      title="Cashflow"
      showCashflow
      subtitle="Debit / credit movements from finance import queue"
    />
  );
}
