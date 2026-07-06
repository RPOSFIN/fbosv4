# SalesOS Master Rules

This file is the standing implementation rulebook for SalesOS work in FBOS V1.

## Global Rules

- Do not redesign the application.
- Do not remove any existing feature.
- Preserve current architecture.
- Reuse existing components whenever possible.
- Use TypeScript, React, and Tailwind CSS.
- Follow current project coding standards.
- Keep code production-ready.
- Avoid placeholder code and TODO comments.
- Maintain responsive layout.
- Keep UI fast.
- Do not create duplicate APIs.

## Architecture Rules

- Supabase is the source of truth.
- ClickUp is execution mirror only.
- GVT is calling integration only.
- AI is assistant layer only.
- External sources must not directly write to `leads`.
- Future external inputs should go through intake/inbox/dedupe/convert flow.
- ClickUp must never become CRM master.
- AI suggestions must not directly mutate lead state without user action.

## Current Module

Sales & Call Coach: `/sales-workbench`

## Standing Decision

Implement pending work step by step by phase. When a new phase reaches a pending task listed in the backlog, include it naturally in that implementation instead of trying to build everything at once.
