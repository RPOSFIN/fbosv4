create or replace function public.get_leads_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*)::int from public.leads),
    'won', (select count(*)::int from public.leads where upper(coalesce(status, '')) = 'WON'),
    'lost', (select count(*)::int from public.leads where upper(coalesce(status, '')) = 'LOST'),
    'active', (
      select count(*)::int
      from public.leads
      where upper(coalesce(status, 'NEW')) not in ('WON', 'LOST')
    ),
    'statusBreakdown', coalesce(
      (
        select jsonb_object_agg(st, cnt)
        from (
          select upper(coalesce(status, 'NEW')) as st, count(*)::int as cnt
          from public.leads
          group by 1
        ) s
      ),
      '{}'::jsonb
    ),
    'sourceBreakdown', coalesce(
      (
        select jsonb_object_agg(src, cnt)
        from (
          select coalesce(nullif(trim(source), ''), 'Unknown') as src, count(*)::int as cnt
          from public.leads
          group by 1
        ) s
      ),
      '{}'::jsonb
    ),
    'unique', (
      select count(*)::int
      from (
        select distinct
          lower(trim(coalesce(company_name, ''))),
          regexp_replace(coalesce(mobile, ''), '[^0-9]', '', 'g')
        from public.leads
        where coalesce(trim(company_name), '') <> ''
           or coalesce(trim(mobile), '') <> ''
      ) u
    ),
    'recentLeads', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'company_name', l.company_name,
            'status', coalesce(l.status, 'NEW'),
            'source', coalesce(nullif(trim(l.source), ''), 'Unknown'),
            'created_at', l.created_at
          )
          order by l.created_at desc
        )
        from (
          select id, company_name, status, source, created_at
          from public.leads
          order by created_at desc
          limit 8
        ) l
      ),
      '[]'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_leads_stats() from public;
grant execute on function public.get_leads_stats() to anon, authenticated;
