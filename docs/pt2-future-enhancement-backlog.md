# FBOS V1 PT2 Future Enhancement Backlog

PT2 is enhancement only. Do not modify completed PT functionality, do not redesign the app, and do not break existing modules.

## Current Modules Covered

- CEO Command Center
- Sales & Call Coach
- FinanceOS
- Operations Live

## Global Rules

- Maintain existing architecture.
- Preserve current functionality.
- Use existing components.
- No placeholder code.
- No TODO comments.
- TypeScript, React, Tailwind CSS.
- Production-ready, responsive, high performance.

## PT2-01 MCP Status UI

- Remove status text.
- Show only one small status dot.
- Place near FlexiFlair Live watermark or CEO Command Center title.
- No text and no label.

Color rules:

- Green: connected
- Blue: processing
- Yellow: connecting
- Red: disconnected
- Gray: disabled

Hover tooltip should show:

- Provider
- Model
- Last response
- Response time

## PT2-02 Settings

Fix and improve:

- Route Settings
- Affirmation Settings

## PT2-03 Dashboard UI

Improve:

- Free Cash Info
- Sidebar
- Time Box
- QuotationOS Layout
- Remove `Main` word from sidebar
- Remove Call Coach widget from dashboard bottom
- Spacing
- Alignment
- Empty space utilization

## PT2-04 CEO Command Center

Create executive dashboard widgets:

- Running Call Graph
- Running Operations / Minute
- Cash Entry
- Target Completion
- Visionary
- Sales Health
- Finance Health
- Production Health
- Dispatch Health
- Overall Company Health

## PT2-05 Live Target Engine

Create Live Daily Target Engine.

Working hours:

- 10:00 AM to 7:00 PM
- Refresh every 2 minutes

Display:

- Current Time
- Call Attempts
- Connected Calls
- Pending Calls
- Target Percentage
- Remaining Calls
- Performance
- Half-hour progress

## PT2-06 Live Update Engine

Auto-refresh without full page refresh:

- Sales OS
- FinanceOS
- Operations
- Assigned Tasks
- Dashboard Cards
- Reports

## PT2-07 Production Tracker

Show production status:

- Artwork Done
- Approval Mail Sent
- Dispatch Done
- Delivery Pending

## PT2-08 Reminder Center

Create reminders for:

- Docket Reminder
- Bilty Reminder
- Order Reminder
- Hold Reminder
- Unhold Reminder
- Upcoming Dispatch
- Approval Pending

## PT2-09 Analytics

Create executive analytics:

- Today's Sales
- Today's Calls
- Today's Followups
- Today's Revenue
- Dispatch Today
- Pending Orders
- Production Running
- Cash Position

## PT2-10 UI Polish

Improve:

- Dashboard spacing
- Cards
- Typography
- Consistency
- Alignment
- Responsive layout
- Sidebar animation
- Hover effects
- Loading animation

## Expected Sprint Output

Every PT2 sprint should report:

1. Files modified
2. Components added
3. Dashboard changes
4. API changes
5. Performance improvements
6. Testing checklist
7. Known issues
8. Future recommendation
