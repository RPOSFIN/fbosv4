import { notFound } from "next/navigation";
import { FinanceModulePage } from "@/components/financeos/view";
import { getFinanceModuleRuntime } from "@/lib/financeos/live-data";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const runtime = await getFinanceModuleRuntime(slug);
  if (!runtime) notFound();
  return <FinanceModulePage runtime={runtime} />;
}
