-- FBOS Phase: Finance/Tally Reconciliation architecture (permanent fix).
--
-- Root cause being fixed: finance_transactions is written by the external
-- Tally→Sheet→Supabase import with sync_status='pending_tally' and is never
-- finalized, because the repository owned no mapping/finalization step. This
-- migration brings finance_transactions into the schema SSOT, adds the status
-- lifecycle (pending_tally → processing → synced → verified / failed), an audit
-- + rollback log, indexes/FK, and a DB-level trigger so valid Tally rows can
-- NEVER get permanently stuck in pending_tally again. All statements are
-- additive/idempotent and safe to re-run on an existing production table.

-- 1) finance_transactions (own the schema; matches existing prod columns) ------
create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  source text,
  transaction_type text,
  amount numeric default 0,
  reference_no text,
  sync_status text not null default 'pending_tally',
  tally_sync_at timestamptz,
  created_at timestamptz not null default now()
);

-- Richer mapping + audit columns (no-op if already present).
alter table if exists finance_transactions add column if not exists company text;
alter table if exists finance_transactions add column if not exists voucher_no text;
alter table if exists finance_transactions add column if not exists voucher_type text;
alter table if exists finance_transactions add column if not exists voucher_date date;
alter table if exists finance_transactions add column if not exists queue_id uuid;
alter table if exists finance_transactions add column if not exists sync_note text;
alter table if exists finance_transactions add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_finance_tx_status on finance_transactions(sync_status);
create index if not exists idx_finance_tx_reference on finance_transactions(reference_no);
create index if not exists idx_finance_tx_queue on finance_transactions(queue_id);

-- Map to the import queue (nullable; only set when a queue match is found).
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'finance_tx_queue_fk' and table_name = 'finance_transactions'
  ) then
    alter table finance_transactions
      add constraint finance_tx_queue_fk foreign key (queue_id)
      references finance_import_queue(id) on delete set null;
  end if;
end $$;

-- 2) Reconciliation / audit log (supports rollback) ---------------------------
create table if not exists finance_sync_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null default gen_random_uuid(),
  action text not null,                    -- reconcile | rollback | autosync | report
  from_status text,
  to_status text,
  affected_count integer not null default 0,
  affected jsonb not null default '[]'::jsonb,  -- [{id, from_status}] snapshot for rollback
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_sync_log_batch on finance_sync_log(batch_id);
create index if not exists idx_finance_sync_log_created on finance_sync_log(created_at desc);

-- 3) updated_at maintenance ---------------------------------------------------
create or replace function public.finance_tx_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists finance_tx_updated on finance_transactions;
create trigger finance_tx_updated before update on finance_transactions
  for each row execute function public.finance_tx_set_updated_at();

-- 4) Anti-stuck trigger: a valid Tally row can never persist as pending_tally.
--    On insert, a complete Tally row (source=tally + amount + reference_no) is
--    automatically advanced to 'synced' and timestamped. Incomplete rows stay
--    pending_tally and are surfaced by the reconciliation service as 'failed'.
create or replace function public.finance_tx_auto_sync()
returns trigger language plpgsql as $$
begin
  if new.sync_status = 'pending_tally'
     and lower(coalesce(new.source, '')) = 'tally'
     and new.amount is not null
     and coalesce(new.reference_no, '') <> '' then
    new.sync_status := 'synced';
    if new.tally_sync_at is null then
      new.tally_sync_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists finance_tx_auto_sync_trg on finance_transactions;
create trigger finance_tx_auto_sync_trg before insert on finance_transactions
  for each row execute function public.finance_tx_auto_sync();

-- 5) finance_sync_log security (service-role only; app uses the admin client) --
alter table finance_sync_log enable row level security;
grant all on finance_sync_log to service_role;
grant all on finance_transactions to service_role;
