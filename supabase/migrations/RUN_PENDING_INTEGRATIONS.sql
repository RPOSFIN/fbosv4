-- FBOS: Run pending integration migrations (Phase 3 + ClickUp dedupe)
-- Safe to run in Supabase SQL Editor when DATABASE_URL is not available locally.
-- Renames legacy integrations table, then applies 003 + 005.

alter table if exists integrations rename to integrations_legacy_phase2;

-- FBOS Phase 3: Integration Hub connectors
-- Run in Supabase SQL Editor: supabase/migrations/003_integrations.sql

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  connector_name text not null unique,
  status text not null default 'pending'
    check (status in ('connected', 'pending', 'error')),
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integrations_status on integrations(status);
create index if not exists idx_integrations_connector on integrations(connector_name);

insert into integrations (connector_name, status, config)
values
  ('gsheet', 'connected', '{"label": "Google Sheets"}'::jsonb),
  ('clickup', 'pending', '{"label": "ClickUp"}'::jsonb),
  ('tally', 'pending', '{"label": "Tally"}'::jsonb)
on conflict (connector_name) do nothing;

alter table integrations enable row level security;

drop policy if exists integrations_read on integrations;
create policy integrations_read on integrations
  for select using (auth.role() = 'authenticated');

drop policy if exists integrations_write on integrations;
create policy integrations_write on integrations
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

-- ClickUp task link on leads + partial unique index for upsert by task id

alter table if exists leads add column if not exists clickup_task_id text;

create unique index if not exists idx_leads_clickup_task_id_unique
  on leads (clickup_task_id)
  where clickup_task_id is not null;
