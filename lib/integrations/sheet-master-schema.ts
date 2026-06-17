/**
 * FBOS — ONE Tally finance sheet (all types in one tab).
 * data_type: voucher | ledger | receivable | payable | bank_cash
 */

export const FINANCE_TALLY_TAB = "06_Finance_Sync";

export const FINANCE_TALLY_HEADERS = [
  "data_type",
  "company_name",
  "voucher_date",
  "voucher_no",
  "voucher_type",
  "party_name",
  "ledger_name",
  "parent_group",
  "description",
  "debit",
  "credit",
  "amount",
  "opening_balance",
  "closing_balance",
  "outstanding_amount",
  "bill_no",
  "bill_date",
  "due_date",
  "overdue_days",
  "bank_name",
  "account_no",
  "balance",
  "as_on_date",
  "gst_no",
  "reference",
  "narration",
  "synced_at",
] as const;

/** Finance-first phase — only Tally master tab + sync log */
export const FINANCE_PHASE_TABS = [
  {
    name: "00_Sync_Status",
    description: "Auto sync log",
    headers: ["sync_time", "source", "tab", "rows", "status", "message"],
  },
  {
    name: FINANCE_TALLY_TAB,
    envGidKey: "GOOGLE_SHEET_GID_FINANCE",
    description: "All Tally data — vouchers, ledgers, receivable, payable, bank",
    headers: [...FINANCE_TALLY_HEADERS],
  },
] as const;
