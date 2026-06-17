-- Phase 3 supplemental: ClickUp task cache + Tally finance import queue

create table if not exists clickup_tasks (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  status text,
  team_id text,
  team_name text,
  space_id text,
  space_name text,
  list_id text,
  list_name text,
  raw jsonb default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_clickup_tasks_external on clickup_tasks(external_id);
create index if not exists idx_clickup_tasks_synced on clickup_tasks(synced_at desc);

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

create index if not exists idx_finance_import_queue_status on finance_import_queue(status);

alter table clickup_tasks enable row level security;
alter table finance_import_queue enable row level security;

drop policy if exists clickup_tasks_read on clickup_tasks;
create policy clickup_tasks_read on clickup_tasks
  for select using (auth.role() = 'authenticated');

drop policy if exists clickup_tasks_write on clickup_tasks;
create policy clickup_tasks_write on clickup_tasks
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

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
