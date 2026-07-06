import CommandHeader from "@/components/command-center/command-header";
import { pageShell } from "@/components/command-center/theme";
import SalesDataQualityPanel from "@/components/sales/data-quality-panel";

export default function SalesDataQualityPage() {
  return (
    <div className="min-h-screen">
      <CommandHeader title="Sales Data Quality" />
      <div className={`${pageShell} space-y-5`}>
        <SalesDataQualityPanel />
      </div>
    </div>
  );
}
