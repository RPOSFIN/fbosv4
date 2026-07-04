import { getAdminClient } from "@/lib/supabase/admin";

export type BalanceSheetSection = "assets" | "liabilities" | "equity" | "unclassified";

export type DerivedBalanceSheetRow = {
  section: BalanceSheetSection;
  group_name: string;
  ledger_count: number;
  opening_balance: number;
  closing_balance: number;
  source: "tally_ledgers";
  confidence: "derived";
};

export type DerivedBalanceSheetReport = {
  status: "derived" | "unavailable";
  source: "tally_ledgers" | "none";
  note: string;
  row_count: number;
  rows: DerivedBalanceSheetRow[];
  totals: Record<BalanceSheetSection, number>;
  generated_at: string;
};

type TallyLedgerBalanceRow = {
  group_name: string | null;
  parent: string | null;
  opening_balance: number | string | null;
  closing_balance: number | string | null;
};

const PROFIT_AND_LOSS_GROUPS = [
  "sales accounts",
  "purchase accounts",
  "direct expenses",
  "indirect expenses",
  "direct incomes",
  "indirect incomes",
];

const ASSET_GROUPS = [
  "bank accounts",
  "cash-in-hand",
  "current assets",
  "fixed assets",
  "loans & advances",
  "stock-in-hand",
  "sundry debtors",
  "deposits",
  "tds &tcs receivable",
  "tds & tcs receivable",
];

const LIABILITY_GROUPS = [
  "current liabilities",
  "duties & taxes",
  "gst",
  "loans (liability)",
  "provisions",
  "salary payable",
  "sundry creditors",
  "tds payable",
];

const EQUITY_GROUPS = ["capital account", "reserves & surplus", "retained earnings"];

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: string | null | undefined): string {
  return (value || "").replace(/&#\d+;/g, "").trim().toLowerCase();
}

function matchesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function classifyBalanceSheetGroup(groupName: string): BalanceSheetSection | "profit_loss" {
  const group = normalize(groupName);
  if (!group) return "unclassified";
  if (matchesAny(group, PROFIT_AND_LOSS_GROUPS)) return "profit_loss";
  if (matchesAny(group, ASSET_GROUPS)) return "assets";
  if (matchesAny(group, LIABILITY_GROUPS)) return "liabilities";
  if (matchesAny(group, EQUITY_GROUPS)) return "equity";
  return "unclassified";
}

export async function buildDerivedBalanceSheet(): Promise<DerivedBalanceSheetReport> {
  const supabase = getAdminClient();
  if (!supabase) {
    return {
      status: "unavailable",
      source: "none",
      note: "Database not configured",
      row_count: 0,
      rows: [],
      totals: { assets: 0, liabilities: 0, equity: 0, unclassified: 0 },
      generated_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("tally_ledgers")
    .select("group_name, parent, opening_balance, closing_balance");

  if (error || !data?.length) {
    return {
      status: "unavailable",
      source: "tally_ledgers",
      note: "Ledger masters are unavailable; Balance Sheet cannot be derived yet",
      row_count: 0,
      rows: [],
      totals: { assets: 0, liabilities: 0, equity: 0, unclassified: 0 },
      generated_at: new Date().toISOString(),
    };
  }

  const grouped = new Map<string, DerivedBalanceSheetRow>();

  for (const ledger of data as TallyLedgerBalanceRow[]) {
    const rawGroup = ledger.group_name || ledger.parent || "Unclassified";
    const section = classifyBalanceSheetGroup(rawGroup);
    if (section === "profit_loss") continue;

    const groupName = rawGroup.replace(/&#\d+;/g, "").trim() || "Unclassified";
    const key = `${section}:${groupName.toLowerCase()}`;
    const existing = grouped.get(key) ?? {
      section,
      group_name: groupName,
      ledger_count: 0,
      opening_balance: 0,
      closing_balance: 0,
      source: "tally_ledgers" as const,
      confidence: "derived" as const,
    };

    existing.ledger_count += 1;
    existing.opening_balance += toNumber(ledger.opening_balance);
    existing.closing_balance += toNumber(ledger.closing_balance);
    grouped.set(key, existing);
  }

  const rows = Array.from(grouped.values()).sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return Math.abs(b.closing_balance) - Math.abs(a.closing_balance);
  });

  const totals = rows.reduce<Record<BalanceSheetSection, number>>(
    (acc, row) => {
      acc[row.section] += row.closing_balance;
      return acc;
    },
    { assets: 0, liabilities: 0, equity: 0, unclassified: 0 },
  );

  return {
    status: rows.length > 0 ? "derived" : "unavailable",
    source: "tally_ledgers",
    note: "Derived from synced Tally ledger closing balances. Do not mark as synced until structured Tally Balance Sheet rows are parsed.",
    row_count: rows.length,
    rows,
    totals,
    generated_at: new Date().toISOString(),
  };
}
