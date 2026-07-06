import { FinanceShell } from "@/components/financeos/finance-shell";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceShell>{children}</FinanceShell>;
}
