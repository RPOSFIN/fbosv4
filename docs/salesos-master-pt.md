# SalesOS Master PT Backlog

This backlog captures the owner-approved pending tasks for SalesOS. Do not build everything at once. Pull items into implementation only when the current phase reaches them.

## PT-01 UI and Workflow

- Recording UI and horizontal recording bar
- Start/stop/save recording controls
- Frozen / collapsible sidebar
- Improved WhatsApp and Email icons
- Frozen quick action panel
- Frozen / repositioned AI suggestion panel
- Wide AI suggestion mode
- Mirror window expand/collapse
- Improved mirror panel layout
- Mirror and Supabase panels placed below top cards
- Six-card alignment and full justification
- Followup popup
- Direct call, WhatsApp, and email actions
- Company OCR upload
- Drawing / artwork upload and local artwork storage
- Last 3 days followup list
- Auto call queue and back-to-back calling
- CSV export after every 20 calls, overwriting the previous generated CSV
- Daily call statistics
- WhatsApp templates during call
- Split-window calculator during quotation
- Download/share contact panel
- Multi-select checkbox actions
- One-click AI share
- Quote PDF share
- Email share
- WhatsApp share
- Save contact icon
- GVT UI integration later

## PT-02 AI / LLM

- AI suggestion connection
- AI analysis enablement
- Save AI result
- Voice assistant
- Auto script typing
- ChatGPT/MCP integration
- Google Sheets quotation support
- Smart reply
- Quote message generator
- Categorization
- Auto routing

AI fields to store include summary, interest, objection, reply draft, next action, followup, and confidence.

## PT-03 Supabase Data Quality

- Live leads
- Mobile number
- Assigned to / assigned user
- Due date
- Created by
- Address
- Contact person
- Date stamp
- Watermark
- Mirror difference
- Sync validation
- Multiple head mapping
- No empty fields

## PT-04 Mapping

Review mapping for ClickUp, Supabase, mirror data, environment, Google Sheets, Apps Script, GVT, category routing, Execution Hub dropdowns, and all ClickUp features.

## PT-05 Fetch Issues

Fix mirror leads, icon details, record count, missing records, and data validation.

## PT-06 Knowledge Base

Create support for client reference, location, PIN code, GST, transportation cost, delivery days, reference notes, and quotation notes.

## PT-07 Calling

Implement followup calling window, auto queue, CSV export, call analytics, outgoing attempts, talk time, connected calls, not connected calls, and retry queue.

## PT-08 WhatsApp

Implement business WhatsApp support, quick templates, reply suggestions, and live call templates.

## PT-09 ClickUp

ClickUp remains execution mirror only. Support sync, status, tasks, comments, priority, assignee, due date, tags, custom fields, attachments, webhooks, and API validation.

## PT-10 MCP Status

Top header should show only one status dot, no text and no label.

Colors: green connected, yellow connecting, blue processing, red disconnected, gray disabled.

Tooltip should show OpenAI via MCP, model, last response, and response time.

## PT-11 Review

Review live leads, mobile numbers, mirror vs Supabase, duplicate detection, and data consistency.

## Required Sprint Output

Each sprint should report files modified, components added, APIs modified, Supabase changes, functions added, UI improvements, testing checklist, known issues, and recommended next sprint.
