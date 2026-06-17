-- Paste in Supabase → SQL Editor → Run (Finance hub one-time setup)

create table if not exists finance_import_queue (
  id uuid primary key default gen_random_uuid(),
  company text,
  record_type text not null default 'ledger',
  description text,
  amount numeric default 0,
  voucher_date date,
  status text not null default 'queued'
    check (status in ('queued', 'imported', 'failed')),
  source text not null default 'demo'
    check (source in ('demo', 'tally', 'xml')),
  raw_xml text,
  created_at timestamptz not null default now()
);

alter table if exists finance_import_queue add column if not exists voucher_no text;
alter table if exists finance_import_queue add column if not exists voucher_type text;
alter table if exists finance_import_queue add column if not exists ledger_name text;
alter table if exists finance_import_queue add column if not exists party_name text;
alter table if exists finance_import_queue add column if not exists debit numeric default 0;
alter table if exists finance_import_queue add column if not exists credit numeric default 0;
alter table if exists finance_import_queue add column if not exists reference text;
alter table if exists finance_import_queue add column if not exists narration text;
alter table if exists finance_import_queue add column if not exists gst_no text;

create index if not exists idx_finance_import_queue_status on finance_import_queue(status);

alter table finance_import_queue enable row level security;

drop policy if exists finance_import_queue_read on finance_import_queue;
create policy finance_import_queue_read on finance_import_queue
  for select using (auth.role() = 'authenticated');

drop policy if exists finance_import_queue_write on finance_import_queue;
create policy finance_import_queue_write on finance_import_queue
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

create table if not exists sheet_sync_log (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'apps_script',
  tab_name text,
  rows_imported integer default 0,
  status text not null default 'ok',
  message text,
  synced_at timestamptz not null default now()
);

create index if not exists idx_sheet_sync_log_synced on sheet_sync_log(synced_at desc);

alter table sheet_sync_log enable row level security;

drop policy if exists sheet_sync_log_read on sheet_sync_log;
create policy sheet_sync_log_read on sheet_sync_log
  for select using (auth.role() = 'authenticated');

drop policy if exists sheet_sync_log_write on sheet_sync_log;
create policy sheet_sync_log_write on sheet_sync_log
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );
