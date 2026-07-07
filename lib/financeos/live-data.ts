import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { financeModules, initialFinanceDashboard } from "./finance-data";
import type { FinanceDashboardData, FinanceMetric, FinanceModule } from "./finance-types";

type DbRow = Record<string, unknown>;

export type FinanceTableRow = {
  cells: string[];
};

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
};

const EMPTY_DATASET: FinanceDataset = {
  families: [],
  familyMembers: [],
  income: [],
  expenses: [],
  investments: [],
  borrowings: [],
  policies: [],
  goals: [],
  transactions: [],
};

export async function getFinanceDashboardRuntime(): Promise<FinanceDashboardRuntime> {
  const dataset = await fetchFinanceDataset();
  const totals = calculateTotals(dataset);
  const hasLiveRows = Object.values(dataset).some((rows) => rows.length > 0);

  return {
    ...initialFinanceDashboard,
    lastSync: new Date().toISOString(),
    supabaseStatus: hasLiveRows ? "Connected" : "Needs configuration",
    tallyStatus: dataset.transactions.length > 0 ? "Synced" : "Pending sync",
    kpis: buildDashboardKpis(totals),
    health: initialFinanceDashboard.health.map((card) => ({
      ...card,
      score: hasLiveRows ? deriveScore(card.id, totals) : null,
      status: hasLiveRows ? "Live Supabase data" : "Data required",
      action: dataset.transactions.length > 0 ? "Review mapped source rows." : "Sync transactions / ledger rows from Tally or Supabase.",
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
    sourceStatus: rows.length > 0 ? "Live Supabase rows" : "No rows in Supabase for this module yet",
    metrics: [
      { ...item.metrics[0], value: rows.length, suffix: " rows", description: rows.length > 0 ? "Rows read from Supabase." : "Source table currently empty." },
      { ...item.metrics[1], value: deriveScore(slug, totals), suffix: "/100", description: "Calculated from available FinanceOS tables." },
      { ...item.metrics[2], value: missingSourceCount(dataset), description: "Empty FinanceOS source tables still blocking complete ledger visibility." },
    ],
  };
}

async function fetchFinanceDataset(): Promise<FinanceDataset> {
  const supabase = getAdminClient() ?? await createSupabaseServerClient();

  const [families, familyMembers, income, expenses, investments, borrowings, policies, goals, transactions] = await Promise.all([
    readTable(supabase, "families", "id,name,created_at,owner_user_id"),
    readTable(supabase, "family_members", "id,family_id,name,relationship,role,occupation,is_active,created_at"),
    readTable(supabase, "income", "id,family_id,member_id,income_type,source_name,amount,frequency,start_date,notes,created_at"),
    readTable(supabase, "expenses", "id,family_id,member_id,expense_type,category,subcategory,amount,expense_date,notes,created_at"),
    readTable(supabase, "investments", "id,family_id,member_id,investment_type,investment_name,invested_amount,current_value,start_date,notes,created_at"),
    readTable(supabase, "borrowings", "id,family_id,loan_type,loan_name,outstanding,emi,interest_rate,remaining_months,created_at"),
    readTable(supabase, "protection_policies", "id,family_id,policy_type,provider,premium,coverage,renewal_date,notes,created_at"),
    readTable(supabase, "goals", "id,family_id,goal_type,goal_owner,goal_name,target_amount,current_amount,target_date,priority,status,created_at"),
    readTable(supabase, "transactions", "id,user_id,amount,type,category,description,date,created_at"),
  ]);

  return { families, familyMembers, income, expenses, investments, borrowings, policies, goals, transactions };
}

async function readTable(supabase: any, table: string, select: string): Promise<DbRow[]> {
  const { data, error } = await supabase.from(table).select(select).limit(1000);
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
  const transactionDebit = sum(dataset.transactions.filter((row) => String(row.type).toLowerCase() !== "income"), "amount");
  const transactionCredit = sum(dataset.transactions.filter((row) => String(row.type).toLowerCase() === "income"), "amount");
  const assets = currentValue || invested;
  const netWorth = assets - borrowings;

  return { income, expenses, invested, currentValue, borrowings, emi, transactionDebit, transactionCredit, assets, netWorth };
}

function buildDashboardKpis(totals: ReturnType<typeof calculateTotals>): FinanceMetric[] {
  const values: Record<string, number> = {
    sales: totals.income + totals.transactionCredit,
    purchase: totals.expenses + totals.transactionDebit,
    receipts: totals.transactionCredit,
    payments: totals.transactionDebit,
    receivables: 0,
    payables: totals.borrowings,
    "cash-in-bank": 0,
    "cash-in-hand": 0,
    "free-cash": totals.income - totals.expenses - totals.emi,
    "working-capital": totals.assets - totals.borrowings,
    "net-worth": totals.netWorth,
    "monthly-profit": totals.income - totals.expenses,
    "monthly-expenses": totals.expenses,
    outstanding: totals.borrowings,
    "credit-utilization": totals.borrowings,
  };

  return initialFinanceDashboard.kpis.map((metric) => ({
    ...metric,
    value: values[metric.id] ?? null,
    prefix: "₹",
    description: "Live from Supabase FinanceOS tables; 0 means no rows in the source table yet.",
  }));
}

function buildAlerts(dataset: FinanceDataset) {
  const empty = emptySources(dataset);
  return [
    {
      id: "supabase-live",
      title: "Supabase source connected",
      body: `Loaded ${dataset.families.length} families, ${dataset.familyMembers.length} members, ${dataset.investments.length} investments, ${dataset.borrowings.length} borrowings and ${dataset.transactions.length} transactions.`,
      tone: "info" as const,
    },
    {
      id: "empty-ledger-sources",
      title: empty.length ? "Ledger source incomplete" : "Ledger source complete",
      body: empty.length ? `Empty tables: ${empty.join(", ")}. Ledger screens can only show available rows until these are synced.` : "All FinanceOS source tables have rows.",
      tone: empty.length ? "warning" as const : "positive" as const,
    },
  ];
}

function buildLedgerRows(dataset: FinanceDataset): FinanceTableRow[] {
  return [
    ...dataset.investments.map((row) => ({ cells: [text(row.investment_name), text(row.investment_type), inr(row.invested_amount), "0", inr(row.current_value), inr(row.current_value), "Investment"] })),
    ...dataset.borrowings.map((row) => ({ cells: [text(row.loan_name), text(row.loan_type), inr(row.outstanding), inr(row.emi), "0", inr(row.outstanding), "Borrowing"] })),
    ...dataset.income.map((row) => ({ cells: [text(row.source_name), text(row.income_type), "0", "0", inr(row.amount), inr(row.amount), "Income"] })),
    ...dataset.expenses.map((row) => ({ cells: [text(row.category), text(row.expense_type), "0", inr(row.amount), "0", inr(row.amount), "Expense"] })),
  ];
}

function buildTransactionRows(dataset: FinanceDataset): FinanceTableRow[] {
  return dataset.transactions.map((row) => ({
    cells: [dateText(row.date), text(row.id).slice(0, 8), text(row.category), text(row.type), String(row.type).toLowerCase() === "income" ? "0" : inr(row.amount), String(row.type).toLowerCase() === "income" ? inr(row.amount) : "0", text(row.description), "Supabase"],
  }));
}

function buildSourceRows(dataset: FinanceDataset): FinanceTableRow[] {
  return [
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
  if (id.includes("debt") || id.includes("loan")) return totals.borrowings > 0 ? 60 : 100;
  if (id.includes("profit")) return totals.income > totals.expenses ? 80 : 40;
  if (id.includes("cash") || id.includes("liquidity")) return totals.income - totals.expenses - totals.emi >= 0 ? 70 : 35;
  return totals.assets || totals.borrowings || totals.income || totals.expenses ? 65 : 0;
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
