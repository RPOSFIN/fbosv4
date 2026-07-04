export type TallyDateRange = {
  company: string;
  from: string;
  to: string;
};

export type TallyReportKey =
  | "sales"
  | "purchase"
  | "receipt"
  | "payment"
  | "journal"
  | "contra"
  | "bank_cash"
  | "ledger"
  | "profit_loss"
  | "balance_sheet"
  | "receivables"
  | "payables"
  | "expenses"
  | "party_summary";

export const TALLY_REPORT_KEYS: TallyReportKey[] = [
  "sales",
  "purchase",
  "receipt",
  "payment",
  "journal",
  "contra",
  "bank_cash",
  "ledger",
  "profit_loss",
  "balance_sheet",
  "receivables",
  "payables",
  "expenses",
  "party_summary",
];

export function normalizeTallyReportKey(value: string | null | undefined): TallyReportKey {
  const normalized = (value || "sales").trim().toLowerCase().replace(/-/g, "_");
  return TALLY_REPORT_KEYS.includes(normalized as TallyReportKey) ? (normalized as TallyReportKey) : "sales";
}
