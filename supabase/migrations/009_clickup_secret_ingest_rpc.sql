create or replace function public.ingest_clickup_secret(
  p_secret text,
  p_tasks jsonb,
  p_leads jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  expected_hash text;
  tasks_count integer := 0;
  leads_count integer := 0;
begin
  select value into expected_hash
  from public.fbos_runtime_config
  where key = 'sheet_sync_secret_sha256';

  if expected_hash is null or p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> expected_hash then
    raise exception 'invalid secret' using errcode = '28000';
  end if;

  if p_tasks is not null and jsonb_typeof(p_tasks) = 'array' and jsonb_array_length(p_tasks) > 0 then
    with rows as (
      select *
      from jsonb_to_recordset(p_tasks) as r(
        external_id text,
        name text,
        status text,
        team_id text,
        team_name text,
        space_id text,
        space_name text,
        list_id text,
        list_name text,
        raw jsonb
      )
    ), upserted as (
      insert into public.clickup_tasks (
        external_id, name, status, team_id, team_name, space_id, space_name,
        list_id, list_name, raw, synced_at
      )
      select
        external_id, coalesce(nullif(name, ''), external_id), status, team_id, team_name,
        space_id, space_name, list_id, list_name, coalesce(raw, '{}'::jsonb), now()
      from rows
      where external_id is not null and external_id <> ''
      on conflict (external_id) do update set
        name = excluded.name,
        status = excluded.status,
        team_id = excluded.team_id,
        team_name = excluded.team_name,
        space_id = excluded.space_id,
        space_name = excluded.space_name,
        list_id = excluded.list_id,
        list_name = excluded.list_name,
        raw = excluded.raw,
        synced_at = excluded.synced_at
      returning id
    )
    select count(*) into tasks_count from upserted;
  end if;

  if p_leads is not null and jsonb_typeof(p_leads) = 'array' and jsonb_array_length(p_leads) > 0 then
    with rows as (
      select *
      from jsonb_to_recordset(p_leads) as r(
        company_name text,
        mobile text,
        status text,
        source text,
        clickup_task_id text
      )
    ), updated as (
      update public.leads l
      set company_name = coalesce(nullif(r.company_name, ''), l.company_name),
          mobile = nullif(r.mobile, ''),
          status = coalesce(nullif(r.status, ''), l.status),
          source = coalesce(nullif(r.source, ''), l.source),
          updated_at = now()
      from rows r
      where l.clickup_task_id = r.clickup_task_id
      returning l.id
    ), inserted as (
      insert into public.leads (company_name, mobile, status, source, clickup_task_id)
      select
        coalesce(nullif(r.company_name, ''), 'ClickUp Lead'),
        nullif(r.mobile, ''),
        coalesce(nullif(r.status, ''), 'NEW'),
        coalesce(nullif(r.source, ''), 'ClickUp'),
        r.clickup_task_id
      from rows r
      where r.clickup_task_id is not null
        and r.clickup_task_id <> ''
        and not exists (select 1 from public.leads l where l.clickup_task_id = r.clickup_task_id)
      returning id
    )
    select (select count(*) from updated) + (select count(*) from inserted) into leads_count;
  end if;

  insert into public.integrations (
    connector_name, status, last_sync_at, error_message, config, updated_at
  )
  values (
    'clickup', 'connected', now(), null,
    jsonb_build_object('source','secret_rpc','tasksStored',tasks_count,'leadsSynced',leads_count), now()
  )
  on conflict (connector_name) do update set
    status = excluded.status,
    last_sync_at = excluded.last_sync_at,
    error_message = excluded.error_message,
    config = excluded.config,
    updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'tasksStored', tasks_count, 'leadsSynced', leads_count);
end;
$$;

revoke all on function public.ingest_clickup_secret(text, jsonb, jsonb) from public;
grant execute on function public.ingest_clickup_secret(text, jsonb, jsonb) to anon, authenticated;

