import CommandHeader from "@/components/command-center/command-header";
import CanonicalTallyDashboard from "@/components/finance/tally/canonical-tally-dashboard";
import V2MatrixHeads from "@/components/finance/tally/v2-matrix-heads";

export default function FinanceDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CommandHeader title="Finance Dashboard" badge="CANONICAL TALLY SSOT" />
      <V2MatrixHeads />
      <CanonicalTallyDashboard />
    </div>
  );
}
