import Link from "next/link";
import { getFinanceOsSnapshot } from "@/lib/financeos/queries";

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function FinanceOsPreviewPage() {
  let snapshot;
  let loadError: string | null = null;

  try {
    snapshot = await getFinanceOsSnapshot();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load FinanceOS data";
    snapshot = {
      family: null,
      members: [],
      investments: [],
      borrowings: [],
      totals: {
        invested: 0,
        currentAssets: 0,
        liabilities: 0,
        netWorth: 0,
        monthlyEmi: 0,
      },
    };
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-cyan-400">FinanceOS Preview</p>
          <h1 className="mt-1 text-3xl font-bold">
            {snapshot.family?.name ?? "Family Finance Dashboard"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Connected to Supabase project{" "}
            <code className="rounded bg-slate-900 px-2 py-0.5">skqcjguegqouhbgturgs</code>
          </p>
        </div>
        <Link
          href="/finance"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          Back to Finance Workbench
        </Link>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-red-200">
          Could not load live data: {loadError}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Invested", value: snapshot.totals.invested },
          { label: "Current Assets", value: snapshot.totals.currentAssets },
          { label: "Liabilities", value: snapshot.totals.liabilities },
          { label: "Net Worth", value: snapshot.totals.netWorth },
          { label: "Monthly EMI", value: snapshot.totals.monthlyEmi },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{formatInr(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold">Family Members</h2>
          <div className="space-y-3">
            {snapshot.members.length === 0 ? (
              <p className="text-sm text-slate-400">No members found.</p>
            ) : (
              snapshot.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-slate-400">
                      {[member.relationship, member.occupation].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs text-cyan-300">
                    {member.role ?? "Member"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold">Investments</h2>
          <div className="space-y-3">
            {snapshot.investments.length === 0 ? (
              <p className="text-sm text-slate-400">No investments recorded.</p>
            ) : (
              snapshot.investments.map((investment) => (
                <div
                  key={investment.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{investment.investment_name}</p>
                      <p className="text-sm text-slate-400">{investment.investment_type}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{formatInr(Number(investment.current_value ?? 0))}</p>
                      <p className="text-slate-400">
                        Invested {formatInr(Number(investment.invested_amount ?? 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Borrowings</h2>
          <div className="space-y-3">
            {snapshot.borrowings.length === 0 ? (
              <p className="text-sm text-slate-400">No loans recorded.</p>
            ) : (
              snapshot.borrowings.map((loan) => (
                <div
                  key={loan.id}
                  className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 md:grid-cols-4"
                >
                  <div className="md:col-span-2">
                    <p className="font-medium">{loan.loan_name}</p>
                    <p className="text-sm text-slate-400">{loan.loan_type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Outstanding</p>
                    <p>{formatInr(Number(loan.outstanding ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">EMI / Rate / Months</p>
                    <p className="text-sm">
                      {formatInr(Number(loan.emi ?? 0))} · {loan.interest_rate ?? "—"}% ·{" "}
                      {loan.remaining_months ?? "—"} mo
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
