import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { financeModules, initialFinanceDashboard } from "./finance-data";
import type { FinanceDashboardData, FinanceMetric, FinanceModule } from "./finance-types";

type DbRow = Record<string, unknown>;

export type FinanceTableRow = { cells: string[] };

export type FinanceModuleRuntime = {
  item: FinanceModule;
  metrics: FinanceMetric[];
  rows: FinanceTableRow[];
  sourceStatus: string;
};

export type FinanceDashboardRuntime = FinanceDashboardData & {
  ledgerRows: FinanceTableRow[];
  transactionRows: FinanceTableRow[];
  sourceRows: FinanceTableRow[];
  expenseRows: FinanceTableRow[];
  agingRows: FinanceTableRow[];
};

type FinanceDataset = {
  families: DbRow[];
  familyMembers: DbRow[];
  income: DbRow[];
  expenses: DbRow[];
  investments: DbRow[];
  borrowings: DbRow[];
  policies: DbRow[];
  goals: DbRow[];
  transactions: DbRow[];
  financeTransactions: DbRow[];
  financeQueue: DbRow[];
};

export async function getFinanceDashboardRuntime(): Promise<FinanceDashboardRuntime> {
  const dataset = await fetchFinanceDataset();
  const totals = calculateTotals(dataset);
  const hasLiveRows = Object.values(dataset).some((rows) => rows.length > 0);

  return {
    ...initialFinanceDashboard,
    lastSync: new Date().toISOString(),
    supabaseStatus: hasLiveRows ? "Connected" : "Needs configuration",
    tallyStatus: dataset.financeTransactions.length > 0 ? "Synced" : "Pending sync",
    kpis: buildDashboardKpis(totals),
    health: initialFinanceDashboard.health.map((card) => ({
      ...card,
      score: hasLiveRows ? deriveScore(card.id, totals) : null,
      status: hasLiveRows ? "Live Supabase data" : "Data required",
      action: dataset.financeTransactions.length > 0 ? "Review mapped Tally ledger rows." : "Run Tally sync to populate finance_transactions.",
    })),
    alerts: buildAlerts(dataset),
    ledgerRows: buildLedgerRows(dataset),
    transactionRows: buildTransactionRows(dataset),
    sourceRows: buildSourceRows(dataset),
    expenseRows: buildExpenseRows(dataset),
    agingRows: buildAgingRows(dataset),
  };
}

export async function getFinanceModuleRuntime(slug: string): Promise<FinanceModuleRuntime | null> {
  const item = financeModules[slug];
  if (!item) return null;

  const dataset = await fetchFinanceDataset();
  const totals = calculateTotals(dataset);
  const rows = rowsForModule(slug, dataset);

  return {
    item,
    rows,
    sourceStatus: rows.length > 0 ? "Live Supabase / Tally rows" : "No rows in Supabase for this module yet",
    metrics: [
      { ...item.metrics[0], value: rows.length, suffix: " rows", description: rows.length > 0 ? "Rows read from Supabase." : "Source table currently empty." },
      { ...item.metrics[1], value: deriveScore(slug, totals), suffix: "/100", description: "Calculated from available FinanceOS and Tally rows." },
      { ...item.metrics[2], value: missingSourceCount(dataset), description: "Empty FinanceOS source tables still blocking complete ledger visibility." },
    ],
  };
}

async function fetchFinanceDataset(): Promise<FinanceDataset> {
  const supabase = getAdminClient() ?? await createSupabaseServerClient();

  const [families, familyMembers, income, expenses, investments, borrowings, policies, goals, transactions, financeTransactions, financeQueue] = await Promise.all([
    readTable(supabase, "families", "id,name,created_at,owner_user_id"),
    readTable(supabase, "family_members", "id,family_id,name,relationship,role,occupation,is_active,created_at"),
    readTable(supabase, "income", "id,family_id,member_id,income_type,source_name,amount,frequency,start_date,notes,created_at"),
    readTable(supabase, "expenses", "id,family_id,member_id,expense_type,category,subcategory,amount,expense_date,notes,created_at"),
    readTable(supabase, "investments", "id,family_id,member_id,investment_type,investment_name,invested_amount,current_value,start_date,notes,created_at"),
    readTable(supabase, "borrowings", "id,family_id,loan_type,loan_name,outstanding,emi,interest_rate,remaining_months,created_at"),
    readTable(supabase, "protection_policies", "id,family_id,policy_type,provider,premium,coverage,renewal_date,notes,created_at"),
    readTable(supabase, "goals", "id,family_id,goal_type,goal_owner,goal_name,target_amount,current_amount,target_date,priority,status,created_at"),
    readTable(supabase, "transactions", "id,user_id,amount,type,category,description,date,created_at"),
    readTable(supabase, "finance_transactions", "id,source,company,transaction_type,voucher_type,voucher_no,voucher_date,ledger_name,amount,reference_no,sync_status,sync_note,tally_sync_at,created_at"),
    readTable(supabase, "finance_import_queue", "id,company,record_type,description,amount,voucher_date,status,source,voucher_no,reference,ledger_name,created_at"),
  ]);

  return { families, familyMembers, income, expenses, investments, borrowings, policies, goals, transactions, financeTransactions, financeQueue };
}

async function readTable(supabase: any, table: string, select: string): Promise<DbRow[]> {
  const { data, error } = await supabase.from(table).select(select).limit(5000);
  if (error) {
    console.error(`[financeos/live-data] ${table} read failed`, error.message);
    return [];
  }
  return data ?? [];
}

function calculateTotals(dataset: FinanceDataset) {
  const income = sum(dataset.income, "amount");
  const expenses = sum(dataset.expenses, "amount");
  const invested = sum(dataset.investments, "invested_amount");
  const currentValue = sum(dataset.investments, "current_value");
  const borrowings = sum(dataset.borrowings, "outstanding");
  const emi = sum(dataset.borrowings, "emi");
  const tallyCredit = sum(dataset.financeTransactions.filter((row) => Number(row.amount ?? 0) > 0), "amount");
  const tallyDebit = Math.abs(sum(dataset.financeTransactions.filter((row) => Number(row.amount ?? 0) < 0), "amount"));
  const transactionDebit = sum(dataset.transactions.filter((row) => String(row.type).toLowerCase() !== "income"), "amount");
  const transactionCredit = sum(dataset.transactions.filter((row) => String(row.type).toLowerCase() === "income"), "amount");
  const assets = currentValue || invested;
  const netWorth = assets - borrowings;
  const cashInflow = income + transactionCredit + tallyCredit;
  const cashOutflow = expenses + transactionDebit + tallyDebit;

  return { income, expenses, invested, currentValue, borrowings, emi, transactionDebit, transactionCredit, tallyCredit, tallyDebit, assets, netWorth, cashInflow, cashOutflow };
}

function buildDashboardKpis(totals: ReturnType<typeof calculateTotals>): FinanceMetric[] {
  const values: Record<string, number> = {
    sales: totals.income + totals.transactionCredit + totals.tallyCredit,
    purchase: totals.expenses + totals.transactionDebit + totals.tallyDebit,
    receipts: totals.transactionCredit + totals.tallyCredit,
    payments: totals.transactionDebit + totals.tallyDebit,
    receivables: 0,
    payables: totals.borrowings,
    "cash-in-bank": 0,
    "cash-in-hand": totals.cashInflow - totals.cashOutflow,
    "free-cash": totals.cashInflow - totals.cashOutflow,
    "working-capital": totals.assets - totals.borrowings,
    "net-worth": totals.netWorth,
    "monthly-profit": totals.cashInflow - totals.cashOutflow,
    "monthly-expenses": totals.cashOutflow,
    outstanding: totals.borrowings,
    "credit-utilization": totals.borrowings,
  };

  return initialFinanceDashboard.kpis.map((metric) => ({
    ...metric,
    value: values[metric.id] ?? null,
    prefix: "₹",
    description: "Live from Supabase FinanceOS/Tally tables; 0 means no source rows yet.",
  }));
}

function buildAlerts(dataset: FinanceDataset) {
  const empty = emptySources(dataset);
  return [
    {
      id: "supabase-live",
      title: "Supabase source connected",
      body: `Loaded ${dataset.financeTransactions.length} Tally ledger rows, ${dataset.financeQueue.length} queued rows, ${dataset.investments.length} investments and ${dataset.borrowings.length} borrowings.`,
      tone: "info" as const,
    },
    {
      id: "empty-ledger-sources",
      title: empty.length ? "Ledger source incomplete" : "Ledger source complete",
      body: empty.length ? `Empty tables: ${empty.join(", ")}. Run Tally sync for full ledger visibility.` : "All FinanceOS source tables have rows.",
      tone: empty.length ? "warning" as const : "positive" as const,
    },
  ];
}

function buildLedgerRows(dataset: FinanceDataset): FinanceTableRow[] {
  return [
    ...dataset.financeTransactions.map((row) => ({ cells: [text(row.ledger_name || row.sync_note), text(row.voucher_type || row.transaction_type), "0", Number(row.amount) < 0 ? inr(Math.abs(Number(row.amount))) : "0", Number(row.amount) > 0 ? inr(row.amount) : "0", inr(row.amount), text(row.sync_status)] })),
    ...dataset.investments.map((row) => ({ cells: [text(row.investment_name), text(row.investment_type), inr(row.invested_amount), "0", inr(row.current_value), inr(row.current_value), "Investment"] })),
    ...dataset.borrowings.map((row) => ({ cells: [text(row.loan_name), text(row.loan_type), inr(row.outstanding), inr(row.emi), "0", inr(row.outstanding), "Borrowing"] })),
    ...dataset.income.map((row) => ({ cells: [text(row.source_name), text(row.income_type), "0", "0", inr(row.amount), inr(row.amount), "Income"] })),
    ...dataset.expenses.map((row) => ({ cells: [text(row.category), text(row.expense_type), "0", inr(row.amount), "0", inr(row.amount), "Expense"] })),
  ];
}

function buildTransactionRows(dataset: FinanceDataset): FinanceTableRow[] {
  const tallyRows = dataset.financeTransactions.map((row) => ({
    cells: [dateText(row.voucher_date || row.created_at), text(row.voucher_no || row.reference_no || row.id).slice(0, 18), text(row.ledger_name || row.sync_note), text(row.voucher_type || row.transaction_type), Number(row.amount) < 0 ? inr(Math.abs(Number(row.amount))) : "0", Number(row.amount) > 0 ? inr(row.amount) : "0", text(row.sync_status), text(row.source)],
  }));
  const appRows = dataset.transactions.map((row) => ({
    cells: [dateText(row.date), text(row.id).slice(0, 8), text(row.category), text(row.type), String(row.type).toLowerCase() === "income" ? "0" : inr(row.amount), String(row.type).toLowerCase() === "income" ? inr(row.amount) : "0", text(row.description), "Supabase"],
  }));
  return [...tallyRows, ...appRows];
}

function buildSourceRows(dataset: FinanceDataset): FinanceTableRow[] {
  return [
    { cells: ["Tally Ledger Rows", String(dataset.financeTransactions.length)] },
    { cells: ["Tally Queue", String(dataset.financeQueue.length)] },
    { cells: ["Families", String(dataset.families.length)] },
    { cells: ["Members", String(dataset.familyMembers.length)] },
    { cells: ["Income", String(dataset.income.length)] },
    { cells: ["Expenses", String(dataset.expenses.length)] },
    { cells: ["Investments", String(dataset.investments.length)] },
    { cells: ["Borrowings", String(dataset.borrowings.length)] },
    { cells: ["Transactions", String(dataset.transactions.length)] },
  ];
}

function buildExpenseRows(dataset: FinanceDataset): FinanceTableRow[] {
  return dataset.expenses.map((row) => ({ cells: [text(row.category), inr(row.amount)] }));
}

function buildAgingRows(dataset: FinanceDataset): FinanceTableRow[] {
  return dataset.borrowings.map((row) => ({ cells: [text(row.loan_name), inr(row.outstanding)] }));
}

function rowsForModule(slug: string, dataset: FinanceDataset): FinanceTableRow[] {
  if (slug === "transactions") return buildTransactionRows(dataset);
  if (slug === "ledgers" || slug === "balance-sheet" || slug === "profit-loss") return buildLedgerRows(dataset);
  if (slug === "payables" || slug === "bank-loan-matrix") return dataset.borrowings.map((row) => ({ cells: [text(row.loan_name), text(row.loan_type), inr(row.outstanding), inr(row.interest_rate), inr(row.emi), text(row.remaining_months), "Live"] }));
  if (slug === "receivables") return dataset.income.map((row) => ({ cells: [text(row.source_name), text(row.income_type), "Current", inr(row.amount), "Low", "Collect"] }));
  if (slug === "cash-flow") return buildTransactionRows(dataset);
  if (slug === "expense-heads") return dataset.expenses.map((row) => ({ cells: [text(row.category), "Not set", inr(row.amount), "Not set", "Live", "Review", "No"] }));
  if (slug === "owner-finance") return dataset.familyMembers.map((row) => ({ cells: [text(row.name), "0", "0", "0", "0", text(row.role)] }));
  if (slug === "reports" || slug === "audit" || slug === "settings") return buildSourceRows(dataset);
  if (slug === "shark-tank-matrix") return buildSourceRows(dataset);
  return [];
}

function deriveScore(id: string, totals: ReturnType<typeof calculateTotals>): number {
  const cash = totals.cashInflow - totals.cashOutflow;
  if (id.includes("debt") || id.includes("loan")) return totals.borrowings > 0 ? 60 : 100;
  if (id.includes("profit")) return cash > 0 ? 80 : 40;
  if (id.includes("cash") || id.includes("liquidity")) return cash >= 0 ? 70 : 35;
  return totals.assets || totals.borrowings || totals.cashInflow || totals.cashOutflow ? 65 : 0;
}

function missingSourceCount(dataset: FinanceDataset): number {
  return emptySources(dataset).length;
}

function emptySources(dataset: FinanceDataset): string[] {
  return Object.entries(dataset)
    .filter(([, rows]) => rows.length === 0)
    .map(([key]) => key);
}

function sum(rows: DbRow[], key: string): number {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function dateText(value: unknown): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function inr(value: unknown): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
