-- FBOS Phase 2: Complete architecture, RBAC, audit, indexes
-- Run in Supabase SQL Editor: supabase/migrations/001_phase2_complete.sql

-- Upgrade existing tables (safe re-run)
alter table if exists leads add column if not exists email text;
alter table if exists leads add column if not exists assigned_to uuid;
alter table if exists leads add column if not exists created_by uuid;
alter table if exists leads add column if not exists updated_by uuid;
alter table if exists leads add column if not exists updated_at timestamptz default now();

alter table if exists clients add column if not exists created_by uuid;
alter table if exists clients add column if not exists updated_by uuid;
alter table if exists clients add column if not exists updated_at timestamptz default now();

alter table if exists followups add column if not exists lead_id uuid;
alter table if exists followups add column if not exists notes text;
alter table if exists followups add column if not exists created_by uuid;
alter table if exists followups add column if not exists updated_by uuid;
alter table if exists followups add column if not exists updated_at timestamptz default now();

alter table if exists quotations add column if not exists client_id uuid;
alter table if exists quotations add column if not exists lead_id uuid;
alter table if exists quotations add column if not exists created_by uuid;
alter table if exists quotations add column if not exists updated_by uuid;
alter table if exists quotations add column if not exists updated_at timestamptz default now();

alter table if exists jobs add column if not exists created_by uuid;
alter table if exists jobs add column if not exists updated_by uuid;
alter table if exists jobs add column if not exists updated_at timestamptz default now();

alter table if exists activity_logs add column if not exists user_id uuid;

create extension if not exists "pgcrypto";

do $$ begin
  create type fbos_role as enum (
    'super_admin',
    'admin',
    'sales',
    'call_coach',
    'operations',
    'accounts',
    'viewer'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role fbos_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_email on profiles(email);

-- ---------------------------------------------------------------------------
-- Business tables
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  mobile text,
  email text,
  status text not null default 'NEW',
  source text,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique,
  company_name text not null,
  contact_person text,
  mobile text,
  email text,
  gst_no text,
  address text,
  credit_limit numeric default 0,
  status text not null default 'Active',
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  company_name text,
  contact_person text,
  next_followup date,
  status text not null default 'Pending',
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_no text,
  client_id uuid references clients(id) on delete set null,
  client_name text,
  lead_id uuid references leads(id) on delete set null,
  amount numeric default 0,
  status text not null default 'Draft',
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  job_no text not null,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'Created',
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique,
  name text not null,
  category text,
  unit text,
  base_rate numeric default 0,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  client_id uuid references clients(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  quantity numeric,
  amount numeric,
  status text not null default 'Advance Waiting',
  order_date date default current_date,
  delivery_date date,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  task_title text not null,
  assigned_to uuid references profiles(id),
  related_entity text,
  related_id uuid,
  status text not null default 'Pending',
  priority text not null default 'Medium',
  due_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists call_coach_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  script_notes text,
  coaching_tips text,
  call_outcome text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  content text not null default '',
  version integer not null default 1,
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text,
  items jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists route_maps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  route_type text,
  steps jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affirmations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  user_id uuid references profiles(id),
  user_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_followups_next on followups(next_followup);
create index if not exists idx_quotations_status on quotations(status);
create index if not exists idx_jobs_client on jobs(client_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_audit_logs_table on audit_logs(table_name, created_at desc);
create index if not exists idx_activity_logs_entity on activity_logs(entity_type, entity_id);
create index if not exists idx_call_coach_lead on call_coach_notes(lead_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.fbos_user_role()
returns fbos_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid() and is_active = true),
    'viewer'::fbos_role
  );
$$;

create or replace function public.fbos_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin');
$$;

create or replace function public.fbos_can_read_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in (
    'super_admin', 'admin', 'sales', 'call_coach', 'operations', 'accounts', 'viewer'
  );
$$;

create or replace function public.fbos_can_write_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin', 'sales');
$$;

create or replace function public.fbos_can_write_call_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin', 'sales', 'call_coach');
$$;

create or replace function public.fbos_can_write_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin', 'operations');
$$;

create or replace function public.fbos_can_write_accounts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin', 'accounts');
$$;

create or replace function public.fbos_can_edit_knowledge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fbos_user_role() in ('super_admin', 'admin');
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::fbos_role, 'viewer'::fbos_role)
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit trigger function
create or replace function public.fbos_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
begin
  select email into actor_email from profiles where id = actor;

  if tg_op = 'INSERT' then
    insert into audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_email)
    values (tg_table_name, new.id, 'INSERT', null, to_jsonb(new), actor, actor_email);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_email)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), actor, actor_email);
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_email)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old), null, actor, actor_email);
    return old;
  end if;
  return null;
end;
$$;

-- Attach audit triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','leads','clients','followups','quotations','jobs',
    'products','orders','tasks','call_coach_notes',
    'sops','checklists','route_maps','affirmations'
  ] loop
    execute format('drop trigger if exists fbos_audit_%I on %I', t, t);
    execute format(
      'create trigger fbos_audit_%I after insert or update or delete on %I for each row execute function public.fbos_audit_trigger()',
      t, t
    );
  end loop;
end $$;

-- updated_at triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','leads','clients','followups','quotations','jobs',
    'orders','call_coach_notes','sops','checklists','route_maps','affirmations'
  ] loop
    execute format('drop trigger if exists fbos_updated_%I on %I', t, t);
    execute format(
      'create trigger fbos_updated_%I before update on %I for each row execute function public.handle_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table leads enable row level security;
alter table clients enable row level security;
alter table followups enable row level security;
alter table quotations enable row level security;
alter table jobs enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table tasks enable row level security;
alter table call_coach_notes enable row level security;
alter table sops enable row level security;
alter table checklists enable row level security;
alter table route_maps enable row level security;
alter table affirmations enable row level security;
alter table activity_logs enable row level security;
alter table audit_logs enable row level security;

-- Drop legacy dev policies
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and policyname like 'fbos_dev_%' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles policies
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or fbos_is_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (fbos_is_admin()) with check (fbos_is_admin());

-- Leads
drop policy if exists leads_select on leads;
create policy leads_select on leads for select to authenticated using (fbos_can_read_sales());
drop policy if exists leads_insert on leads;
create policy leads_insert on leads for insert to authenticated with check (fbos_can_write_sales());
drop policy if exists leads_update on leads;
create policy leads_update on leads for update to authenticated using (fbos_can_write_sales()) with check (fbos_can_write_sales());
drop policy if exists leads_delete on leads;
create policy leads_delete on leads for delete to authenticated using (fbos_is_admin() or fbos_can_write_sales());

-- Followups
drop policy if exists followups_select on followups;
create policy followups_select on followups for select to authenticated using (fbos_can_read_sales());
drop policy if exists followups_write on followups;
create policy followups_write on followups for all to authenticated
  using (fbos_can_write_sales() or fbos_can_write_call_coach())
  with check (fbos_can_write_sales() or fbos_can_write_call_coach());

-- Quotations
drop policy if exists quotations_select on quotations;
create policy quotations_select on quotations for select to authenticated using (fbos_can_read_sales());
drop policy if exists quotations_write on quotations;
create policy quotations_write on quotations for all to authenticated
  using (fbos_can_write_sales()) with check (fbos_can_write_sales());

-- Clients
drop policy if exists clients_select on clients;
create policy clients_select on clients for select to authenticated
  using (fbos_user_role() in ('super_admin','admin','sales','operations','accounts','viewer'));
drop policy if exists clients_write on clients;
create policy clients_write on clients for all to authenticated
  using (fbos_can_write_sales() or fbos_can_write_accounts() or fbos_is_admin())
  with check (fbos_can_write_sales() or fbos_can_write_accounts() or fbos_is_admin());

-- Jobs
drop policy if exists jobs_select on jobs;
create policy jobs_select on jobs for select to authenticated
  using (fbos_user_role() in ('super_admin','admin','sales','operations','accounts','viewer'));
drop policy if exists jobs_write on jobs;
create policy jobs_write on jobs for all to authenticated
  using (fbos_can_write_operations() or fbos_is_admin())
  with check (fbos_can_write_operations() or fbos_is_admin());

-- Call coach notes
drop policy if exists call_coach_select on call_coach_notes;
create policy call_coach_select on call_coach_notes for select to authenticated using (fbos_can_read_sales());
drop policy if exists call_coach_write on call_coach_notes;
create policy call_coach_write on call_coach_notes for all to authenticated
  using (fbos_can_write_call_coach()) with check (fbos_can_write_call_coach());

-- Knowledge tables
drop policy if exists sops_select on sops;
create policy sops_select on sops for select to authenticated using (true);
drop policy if exists sops_write on sops;
create policy sops_write on sops for all to authenticated
  using (fbos_can_edit_knowledge()) with check (fbos_can_edit_knowledge());

drop policy if exists checklists_select on checklists;
create policy checklists_select on checklists for select to authenticated using (true);
drop policy if exists checklists_write on checklists;
create policy checklists_write on checklists for all to authenticated
  using (fbos_can_edit_knowledge()) with check (fbos_can_edit_knowledge());

drop policy if exists route_maps_select on route_maps;
create policy route_maps_select on route_maps for select to authenticated using (true);
drop policy if exists route_maps_write on route_maps;
create policy route_maps_write on route_maps for all to authenticated
  using (fbos_can_edit_knowledge()) with check (fbos_can_edit_knowledge());

drop policy if exists affirmations_select on affirmations;
create policy affirmations_select on affirmations for select to authenticated using (true);
drop policy if exists affirmations_write on affirmations;
create policy affirmations_write on affirmations for all to authenticated
  using (fbos_can_edit_knowledge()) with check (fbos_can_edit_knowledge());

-- Logs (read admin only, insert via authenticated API users)
drop policy if exists activity_logs_select on activity_logs;
create policy activity_logs_select on activity_logs for select to authenticated using (fbos_is_admin() or fbos_user_role() != 'viewer');
drop policy if exists activity_logs_insert on activity_logs;
create policy activity_logs_insert on activity_logs for insert to authenticated with check (auth.uid() is not null);

drop policy if exists audit_logs_select on audit_logs;
create policy audit_logs_select on audit_logs for select to authenticated using (fbos_is_admin());
drop policy if exists audit_logs_insert on audit_logs;
create policy audit_logs_insert on audit_logs for insert to authenticated with check (true);

-- Orders / products / tasks (role controlled)
drop policy if exists products_select on products;
create policy products_select on products for select to authenticated using (true);
drop policy if exists orders_select on orders;
create policy orders_select on orders for select to authenticated using (true);
drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select to authenticated using (true);

-- Block anonymous access on all tables
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema public to authenticated;
