create or replace function public.get_fbos_dashboard_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'leads', (select count(*) from public.leads),
      'followups', (select count(*) from public.followups),
      'quotations', (select count(*) from public.quotations),
      'clients', (select count(*) from public.clients),
      'jobs', (select count(*) from public.jobs),
      'clickup_tasks', (select count(*) from public.clickup_tasks),
      'finance_import_queue', (select count(*) from public.finance_import_queue)
    ),
    'finance', jsonb_build_object(
      'sales', coalesce((select sum(amount) from public.finance_import_queue where lower(coalesce(voucher_type, record_type, '')) like '%sales%'), 0),
      'collections', coalesce((select sum(amount) from public.finance_import_queue where lower(coalesce(voucher_type, record_type, '')) like '%receipt%' or lower(coalesce(description, '')) like '%collection%'), 0),
      'expenses', coalesce((select sum(amount) from public.finance_import_queue where lower(coalesce(voucher_type, record_type, '')) similar to '%(payment|expense|purchase)%'), 0),
      'receivable', coalesce((select sum(amount) from public.finance_import_queue where lower(record_type) = 'receivable'), 0),
      'payable', coalesce((select sum(amount) from public.finance_import_queue where lower(record_type) = 'payable'), 0),
      'freeCash', coalesce((select sum(amount) from public.finance_import_queue where lower(record_type) = 'bank_cash'), 0),
      'badDebts', coalesce((select sum(amount) from public.finance_import_queue where lower(coalesce(description, '')) like '%bad debt%'), 0),
      'overdueAmount', 0,
      'overdueParties', 0,
      'emergencyFund', 0,
      'reserveFund', 0,
      'overdueCollections', 0
    ),
    'integrations', coalesce(
      (
        select jsonb_object_agg(
          connector_name,
          jsonb_build_object(
            'status', status,
            'lastSyncAt', last_sync_at,
            'errorMessage', error_message,
            'config', coalesce(config, '{}'::jsonb)
          )
        )
        from public.integrations
      ),
      '{}'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_fbos_dashboard_status() from public;
grant execute on function public.get_fbos_dashboard_status() to anon, authenticated;

