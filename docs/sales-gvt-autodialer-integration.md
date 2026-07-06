# Sales OS: GVT Auto Dialer and Voice Broadcast Integration Plan

Owner note: GVT Voice Terminal / auto dialer and voice message broadcast should be evaluated for Sales & Call Coach integration.

## Decision

Yes, GVT can be added to Sales & Call Coach if at least one integration path is available:

1. API or database access from GVT.
2. CSV/XLS export from GVT call logs.
3. Local call recording folder or log file watcher.
4. Manual import as fallback.

If API is not available, start with CSV import and recording-folder linking.

## Current GVT screen fields seen from owner screenshot

GVT Today Calls screen includes:

- SR.
- Mode
- Date
- Client ID
- Disposition
- Terminal No.
- Caller Name
- Caller No.
- Duration
- Flag
- Note
- Listen

These should map to Sales Call Coach fields.

## Supabase tables needed

### sales_call_logs

Stores every inbound/outbound call.

Suggested columns:

- id uuid primary key
- lead_id uuid nullable
- client_id uuid nullable
- source text default 'gvt'
- call_provider text default 'gvt_voice_terminal'
- gvt_sr text nullable
- mode text nullable
- call_datetime timestamptz
- client_external_id text nullable
- disposition text nullable
- terminal_no text nullable
- caller_name text nullable
- caller_no text nullable
- duration_seconds integer default 0
- flag text nullable
- note text nullable
- recording_url text nullable
- listen_ref text nullable
- direction text nullable
- transcript text nullable
- ai_summary text nullable
- outcome text nullable
- next_followup_at timestamptz nullable
- raw jsonb
- created_at timestamptz default now()

### sales_voice_broadcasts

Stores broadcast campaigns.

Suggested columns:

- id uuid primary key
- campaign_name text
- provider text default 'gvt'
- message_name text
- audio_url text nullable
- target_source text
- status text
- scheduled_at timestamptz nullable
- started_at timestamptz nullable
- completed_at timestamptz nullable
- total_numbers integer default 0
- successful_calls integer default 0
- failed_calls integer default 0
- raw jsonb
- created_at timestamptz default now()

### sales_voice_broadcast_recipients

Stores per-recipient broadcast result.

Suggested columns:

- id uuid primary key
- broadcast_id uuid references sales_voice_broadcasts(id)
- lead_id uuid nullable
- client_id uuid nullable
- phone_number text
- company_name text nullable
- contact_person text nullable
- call_status text nullable
- duration_seconds integer default 0
- recording_url text nullable
- raw jsonb
- created_at timestamptz default now()

## Mapping from GVT call log to Sales Call Coach

- Date -> sales_call_logs.call_datetime
- Mode -> sales_call_logs.mode and direction
- Client ID -> sales_call_logs.client_external_id
- Disposition -> sales_call_logs.disposition and outcome
- Terminal No. -> sales_call_logs.terminal_no
- Caller Name -> sales_call_logs.caller_name
- Caller No. -> sales_call_logs.caller_no
- Duration -> sales_call_logs.duration_seconds
- Flag -> sales_call_logs.flag
- Note -> sales_call_logs.note
- Listen -> sales_call_logs.listen_ref or recording_url
- Full row -> sales_call_logs.raw

## Lead matching logic

When a call log comes from GVT:

1. Match by caller_no to leads.mobile.
2. If not found, match by caller_no to clients.mobile.
3. If not found, create sales_inbox_events with source = gvt_call.
4. If matched, attach call to sales_call_logs with lead_id or client_id.
5. If disposition requires action, create followup.

## Sales & Call Coach UI additions

Add a GVT section inside Sales & Call Coach:

- GVT connection status
- Import GVT call logs button
- Today's calls table
- Missed calls
- Connected calls
- Call duration
- Listen/recording link
- AI call summary
- Create followup from call
- Link call to lead/client

## Voice broadcast UI additions

Add Broadcast tab:

- Select audience: all leads, hot leads, dormant leads, followup due, custom CSV
- Select audio message
- Schedule broadcast
- Start broadcast
- View per-number result
- Create followups for connected/interested numbers
- Mark failed numbers for retry

## Integration modes

### Mode A: API integration

Best mode. GVT sends or exposes call logs and recordings through API.

Flow:
GVT API -> /api/sales/gvt/sync -> sales_call_logs -> lead matching -> followups -> AI summary

### Mode B: CSV/XLS import

Practical first mode.

Flow:
GVT export CSV/XLS -> /api/sales/gvt/import -> sales_call_logs -> lead matching

### Mode C: Local folder watcher

For recordings.

Flow:
Recording folder -> local sync tool -> upload to Supabase Storage -> sales_call_logs.recording_url

### Mode D: Manual upload fallback

Upload call log file manually and map columns.

## AI Call Coach use

After GVT call log or recording is linked:

- transcribe recording if available
- summarize call
- extract objection
- detect interest level
- suggest next action
- create followup
- update lead_history

## Implementation order

1. Confirm if GVT has API, CSV export, database, or only UI.
2. Create sales_call_logs table.
3. Build CSV/XLS import first.
4. Add lead/client phone matching.
5. Add GVT calls tab in Sales & Call Coach.
6. Add recording link support.
7. Add AI summary after recording/transcript is available.
8. Add voice broadcast campaign tables and UI.
9. Add API/direct sync only after GVT access method is confirmed.

## Golden rule

GVT should not directly update leads. It writes call logs first. Sales OS decides whether to update lead, create followup, or create new inbox event.
