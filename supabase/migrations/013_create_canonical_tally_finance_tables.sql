create table if not exists public.tally_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  company text not null,
  host text,
  port integer,
  from_date date,
  to_date date,
  requested_reports jsonb not null default '[]'::jsonb,
  parsed_counts jsonb not null default '{}'::jsonb,
  inserted_counts jsonb not null default '{}'::jsonb,
  updated_counts jsonb not null default '{}'::jsonb,
  replaced_counts jsonb not null default '{}'::jsonb,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  ai_suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tally_companies (
  id uuid primary key default gen_random_uuid(),
  company text not null unique,
  raw_payload jsonb,
  last_sync_run_id uuid references public.tally_sync_runs(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.tally_ledgers (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  ledger_name text not null,
  parent text,
  group_name text,
  opening_balance numeric,
  closing_balance numeric,
  debit_total numeric not null default 0,
  credit_total numeric not null default 0,
  gst_no text,
  is_bank boolean not null default false,
  is_cash boolean not null default false,
  is_party boolean not null default false,
  raw_payload jsonb,
  last_sync_run_id uuid references public.tally_sync_runs(id),
  updated_at timestamptz not null default now(),
  unique(company, ledger_name)
);

create table if not exists public.tally_parties (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  party_name text not null,
  party_type text,
  ledger_name text,
  gst_no text,
  mobile text,
  email text,
  address text,
  opening_balance numeric,
  closing_balance numeric,
  receivable_total numeric not null default 0,
  payable_total numeric not null default 0,
  raw_payload jsonb,
  last_sync_run_id uuid references public.tally_sync_runs(id),
  updated_at timestamptz not null default now(),
  unique(company, party_name)
);

create table if not exists public.tally_vouchers (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  voucher_key text not null,
  voucher_guid text,
  voucher_no text,
  voucher_type text,
  voucher_date date,
  party_name text,
  ledger_name text,
  reference text,
  narration text,
  gst_no text,
  amount numeric not null default 0,
  debit_total numeric not null default 0,
  credit_total numeric not null default 0,
  source_report text,
  raw_payload jsonb,
  last_sync_run_id uuid references public.tally_sync_runs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, voucher_key)
);

create table if not exists public.tally_voucher_lines (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid references public.tally_vouchers(id) on delete cascade,
  company text not null,
  voucher_no text,
  voucher_type text,
  voucher_date date,
  ledger_name text,
  party_name text,
  line_type text,
  amount numeric not null default 0,
  debit numeric not null default 0,
  credit numeric not null default 0,
  item_name text,
  quantity numeric,
  rate numeric,
  gst_rate numeric,
  tax_amount numeric,
  raw_payload jsonb,
  last_sync_run_id uuid references public.tally_sync_runs(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tally_reports (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  report_type text not null,
  from_date date,
  to_date date,
  data jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  missing_field_count integer not null default 0,
  generated_at timestamptz not null default now(),
  last_sync_run_id uuid references public.tally_sync_runs(id),
  unique(company, report_type, from_date, to_date)
);

create table if not exists public.tally_finance_metrics (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  from_date date,
  to_date date,
  total_sales numeric not null default 0,
  total_purchase numeric not null default 0,
  total_receipts numeric not null default 0,
  total_payments numeric not null default 0,
  receivables numeric not null default 0,
  payables numeric not null default 0,
  cash_in numeric not null default 0,
  cash_out numeric not null default 0,
  bank_in numeric not null default 0,
  bank_out numeric not null default 0,
  gross_profit numeric,
  net_profit numeric,
  cashflow numeric,
  source text not null default 'canonical_tally',
  formula_version text not null default 'tly04_v1',
  generated_at timestamptz not null default now(),
  last_sync_run_id uuid references public.tally_sync_runs(id),
  unique(company, from_date, to_date, formula_version)
);

create table if not exists public.tally_expense_summary (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  from_date date,
  to_date date,
  party_name text,
  ledger_name text,
  category text,
  voucher_count integer not null default 0,
  total_debit numeric not null default 0,
  total_credit numeric not null default 0,
  total_amount numeric not null default 0,
  month date,
  generated_at timestamptz not null default now(),
  last_sync_run_id uuid references public.tally_sync_runs(id)
);

create table if not exists public.tally_ai_diagnostics (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'info',
  module text not null default 'tally',
  issue text not null,
  evidence jsonb not null default '{}'::jsonb,
  suggestion text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists tally_vouchers_company_date_idx on public.tally_vouchers(company, voucher_date);
create index if not exists tally_vouchers_type_idx on public.tally_vouchers(company, voucher_type);
create index if not exists tally_vouchers_party_idx on public.tally_vouchers(company, party_name);
create index if not exists tally_voucher_lines_ledger_idx on public.tally_voucher_lines(company, ledger_name);
create index if not exists tally_expense_summary_party_idx on public.tally_expense_summary(company, party_name, month);
create index if not exists tally_ai_diagnostics_status_idx on public.tally_ai_diagnostics(status, severity);
