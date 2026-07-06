import CommandHeader from "@/components/command-center/command-header";
import { pageShell } from "@/components/command-center/theme";
import ClickUpDeepAuditPanel from "@/components/sales/clickup-deep-audit-panel";

export default function SalesMirrorAuditPage() {
  return (
    <div className="min-h-screen">
      <CommandHeader title="Sales Mirror Audit" />
      <div className={`${pageShell} space-y-5`}>
        <ClickUpDeepAuditPanel />
      </div>
    </div>
  );
}
