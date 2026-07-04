create unique index if not exists clickup_tasks_external_id_uidx
on public.clickup_tasks(external_id);

create unique index if not exists leads_clickup_task_id_uidx
on public.leads(clickup_task_id)
where clickup_task_id is not null;

create index if not exists leads_source_status_idx
on public.leads(source, status);

create index if not exists clickup_tasks_status_synced_idx
on public.clickup_tasks(status, synced_at desc);
