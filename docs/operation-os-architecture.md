# Operation OS Architecture

Owner note: Sales work will be handled first. Operation OS will be planned after Sales.

Decision:
- Operation OS will be one module.
- Supabase will be the source of truth.
- ClickUp will be used as an execution mirror.
- Google Sheets and manual entries will be input sources.
- External enquiry channels and website forms will first enter a central inbox.

Planned flow:
Input source -> ops inbox -> classification -> task/job/followup/order -> dashboard -> optional ClickUp mirror.

Planned pages:
- operations dashboard
- operations inbox
- tasks board
- jobs board
- dispatch view
- artwork view
- sync health
- rules

Planned core tables:
- ops_inbox_events
- ops_entity_links
- ops_task_rules

Existing tables to reuse:
- jobs
- tasks
- route_maps
- activity_logs
- integrations
- clickup_tasks
- leads
- followups
- orders

Sprint plan:
1. Sales first.
2. Then Operation OS inbox and task architecture.
3. Then source integrations.
4. Then ClickUp sync and escalation engine.

Security note: RLS policies must be finalized before production rollout.
