import { notFound } from "next/navigation";
import { FinanceModulePage } from "@/components/financeos/view";
import { financeModules } from "@/lib/financeos/finance-data";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = financeModules[slug];
  if (!item) notFound();
  return <FinanceModulePage item={item} />;
}
