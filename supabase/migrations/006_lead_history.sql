-- Lead sync history: snapshot + changed fields per update (GSheet / ClickUp)

create table if not exists lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  changed_fields jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  source text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_history_lead_id on lead_history(lead_id, synced_at desc);

alter table lead_history enable row level security;

drop policy if exists lead_history_select on lead_history;
create policy lead_history_select on lead_history for select to authenticated using (true);

drop policy if exists lead_history_insert on lead_history;
create policy lead_history_insert on lead_history for insert to authenticated with check (true);
