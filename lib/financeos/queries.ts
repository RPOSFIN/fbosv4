import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceOsSnapshot } from "@/lib/financeos/types";

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFinanceOsSnapshot(): Promise<FinanceOsSnapshot> {
  const supabase = await createSupabaseServerClient();

  const [
    { data: families, error: familiesError },
    { data: members, error: membersError },
    { data: investments, error: investmentsError },
    { data: borrowings, error: borrowingsError },
  ] = await Promise.all([
    supabase.from("families").select("*").order("created_at", { ascending: true }).limit(1),
    supabase.from("family_members").select("*").order("name"),
    supabase.from("investments").select("*"),
    supabase.from("borrowings").select("*"),
  ]);

  const errors = [familiesError, membersError, investmentsError, borrowingsError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error?.message).join("; "));
  }

  const family = families?.[0] ?? null;
  const investmentRows = investments ?? [];
  const borrowingRows = borrowings ?? [];

  const invested = investmentRows.reduce((sum, row) => sum + toNumber(row.invested_amount), 0);
  const currentAssets = investmentRows.reduce((sum, row) => sum + toNumber(row.current_value), 0);
  const liabilities = borrowingRows.reduce((sum, row) => sum + toNumber(row.outstanding), 0);
  const monthlyEmi = borrowingRows.reduce((sum, row) => sum + toNumber(row.emi), 0);

  return {
    family,
    members: members ?? [],
    investments: investmentRows,
    borrowings: borrowingRows,
    totals: {
      invested,
      currentAssets,
      liabilities,
      netWorth: currentAssets - liabilities,
      monthlyEmi,
    },
  };
}
