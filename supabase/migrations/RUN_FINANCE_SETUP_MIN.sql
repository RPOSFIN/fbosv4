-- MINIMAL: run if RUN_FINANCE_SETUP.sql already partially applied
-- Safe to run multiple times

alter table if exists finance_import_queue add column if not exists voucher_no text;
alter table if exists finance_import_queue add column if not exists voucher_type text;
alter table if exists finance_import_queue add column if not exists ledger_name text;
alter table if exists finance_import_queue add column if not exists party_name text;
alter table if exists finance_import_queue add column if not exists debit numeric default 0;
alter table if exists finance_import_queue add column if not exists credit numeric default 0;
alter table if exists finance_import_queue add column if not exists reference text;
alter table if exists finance_import_queue add column if not exists narration text;
alter table if exists finance_import_queue add column if not exists gst_no text;

create table if not exists sheet_sync_log (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'apps_script',
  tab_name text,
  rows_imported integer default 0,
  status text not null default 'ok',
  message text,
  synced_at timestamptz not null default now()
);

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

-- Refresh PostgREST schema cache (Supabase auto-reloads after DDL)
notify pgrst, 'reload schema';
