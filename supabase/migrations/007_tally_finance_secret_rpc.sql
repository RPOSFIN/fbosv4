create extension if not exists pgcrypto;

create table if not exists public.fbos_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.fbos_runtime_config enable row level security;
revoke all on public.fbos_runtime_config from public, anon, authenticated;

create or replace function public.ingest_tally_finance_secret(
  p_secret text,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  expected_hash text;
  inserted_count integer := 0;
begin
  select value into expected_hash
  from public.fbos_runtime_config
  where key = 'sheet_sync_secret_sha256';

  if expected_hash is null or p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> expected_hash then
    raise exception 'invalid secret' using errcode = '28000';
  end if;

  if p_records is null or jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) = 0 then
    return jsonb_build_object('ok', false, 'inserted', 0, 'message', 'records[] required');
  end if;

  with rows as (
    select *
    from jsonb_to_recordset(p_records) as r(
      company text,
      record_type text,
      description text,
      amount numeric,
      voucher_date date,
      voucher_no text,
      voucher_type text,
      ledger_name text,
      party_name text,
      debit numeric,
      credit numeric,
      narration text,
      gst_no text,
      reference text,
      status text,
      source text
    )
  ), inserted as (
    insert into public.finance_import_queue (
      company,
      record_type,
      description,
      amount,
      voucher_date,
      voucher_no,
      voucher_type,
      ledger_name,
      party_name,
      debit,
      credit,
      narration,
      gst_no,
      reference,
      status,
      source
    )
    select
      company,
      coalesce(nullif(record_type, ''), 'ledger'),
      description,
      coalesce(amount, 0),
      voucher_date,
      voucher_no,
      voucher_type,
      ledger_name,
      party_name,
      debit,
      credit,
      narration,
      gst_no,
      reference,
      coalesce(nullif(status, ''), 'queued'),
      coalesce(nullif(source, ''), 'tally')
    from rows
    returning id
  )
  select count(*) into inserted_count from inserted;

  insert into public.integrations (
    connector_name,
    status,
    last_sync_at,
    error_message,
    config,
    updated_at
  )
  values (
    'tally',
    'connected',
    now(),
    null,
    jsonb_build_object('lastIngest', inserted_count, 'source', 'secret_rpc'),
    now()
  )
  on conflict (connector_name) do update set
    status = excluded.status,
    last_sync_at = excluded.last_sync_at,
    error_message = excluded.error_message,
    config = excluded.config,
    updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'inserted', inserted_count);
end;
$$;

revoke all on function public.ingest_tally_finance_secret(text, jsonb) from public;
grant execute on function public.ingest_tally_finance_secret(text, jsonb) to anon, authenticated;

