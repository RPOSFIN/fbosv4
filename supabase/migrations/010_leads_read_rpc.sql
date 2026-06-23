create or replace function public.get_leads_page(
  p_page integer default 1,
  p_limit integer default 50,
  p_search text default '',
  p_status text default '',
  p_source text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer;
  v_total integer;
  v_rows jsonb;
begin
  v_offset := (v_page - 1) * v_limit;

  with filtered as (
    select *
    from public.leads l
    where (coalesce(p_search, '') = ''
      or l.company_name ilike '%' || p_search || '%'
      or coalesce(l.contact_person, '') ilike '%' || p_search || '%'
      or coalesce(l.mobile, '') ilike '%' || p_search || '%')
      and (coalesce(p_status, '') = '' or l.status = p_status)
      and (coalesce(p_source, '') = '' or l.source = p_source)
  )
  select count(*) into v_total from filtered;

  with filtered as (
    select *
    from public.leads l
    where (coalesce(p_search, '') = ''
      or l.company_name ilike '%' || p_search || '%'
      or coalesce(l.contact_person, '') ilike '%' || p_search || '%'
      or coalesce(l.mobile, '') ilike '%' || p_search || '%')
      and (coalesce(p_status, '') = '' or l.status = p_status)
      and (coalesce(p_source, '') = '' or l.source = p_source)
  )
  select coalesce(jsonb_agg(to_jsonb(row_to_json(f)) order by f.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select *
    from filtered
    order by created_at desc
    limit v_limit offset v_offset
  ) f;

  return jsonb_build_object(
    'leads', coalesce(v_rows, '[]'::jsonb),
    'total', coalesce(v_total, 0),
    'page', v_page,
    'limit', v_limit,
    'totalPages', case when v_limit > 0 then ceiling(coalesce(v_total, 0)::numeric / v_limit)::integer else 0 end
  );
end;
$$;

revoke all on function public.get_leads_page(integer, integer, text, text, text) from public;
grant execute on function public.get_leads_page(integer, integer, text, text, text) to anon, authenticated;

