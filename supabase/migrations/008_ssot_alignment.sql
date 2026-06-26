-- FBOS Phase P0-02: Schema SSOT alignment.
--
-- Folds schema objects that runtime code depends on but that were missing from the
-- numbered migration chain (they previously existed only in empty/orphan SQL files:
-- 005_leads_clickup_dedupe.sql was empty; RUN_PENDING_INTEGRATIONS.sql and
-- RUN_FINANCE_SETUP.sql are not part of the numbered sequence). All statements are
-- additive and idempotent; no data or business logic is changed.

-- 1) leads.clickup_task_id — used by lib/integrations/clickup.ts, lib/leads/dedupe.ts,
--    lib/leads/sync-compare.ts, lib/integrations/clickup-leads.ts (ClickUp dedupe key).
alter table if exists leads add column if not exists clickup_task_id text;
create unique index if not exists idx_leads_clickup_task_id_unique
  on leads (clickup_task_id)
  where clickup_task_id is not null;

-- 2) jobs.dispatch_status / jobs.invoice_status — selected by
--    app/api/dashboard/command-center/route.ts.
alter table if exists jobs add column if not exists dispatch_status text;
alter table if exists jobs add column if not exists invoice_status text;

-- 3) sheet_sync_log — written by app/api/webhooks/sheet-sync/route.ts and probed by
--    lib/integrations/sync-data.ts. Previously only in RUN_FINANCE_SETUP.sql (orphan).
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
