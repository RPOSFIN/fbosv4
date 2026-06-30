<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# =====================================================
# FBOS ENGINEERINGOS AGENT BOOTSTRAP
# =====================================================

## Project Identity

Version: 1.0
Last Updated: 2026-06-30
EngineeringOS Version: 2.0

Project: FBOS V4

Architecture: Next.js App Router

Engineering Framework: EngineeringOS

Database: Supabase

Repository Type: Root App Router
----------------------------------------------------
## Repository Signature

PROJECT_ID=FBOS-ENGINEERINGOS

ARCHITECTURE=NEXTJS_APP_ROUTER

ROOT_LAYOUT=APP

WORKSPACE_SIGNATURE=FBOS-ENG-V4

DO_NOT_CREATE_SRC=true

DO_NOT_CREATE_VITE=true
----------------------------------------------------
## Supported AI Agents

- ChatGPT
- Codex
- Claude
- Gemini
- Cursor
- GitHub Copilot
- Arena
----------------------------------------------------

## Before Writing Code

Read:

- ENGINEERINGOS.ID
- ENGINEERINGOS.json

----------------------------------------------------
## Repository Verification Failure

If repository identity cannot be verified:

STOP.

Ask for clarification.

Never invent project structure.

Never assume missing files.

Never create replacement architecture.

----------------------------------------------------

## Verify Engineering Core

Required files:

lib/engineering/ecp.ts

lib/engineering/gates.ts

lib/engineering/promotion.ts
----------------------------------------------------
## Verification Commands

Before completion run (or request the user to run if command execution is unavailable):

npm run build

git status

npm run db:verify

If any verification fails:

STOP.

Fix only the failing issue.

Do not redesign the project.

----------------------------------------------------

## Never Create

src/

vite/

duplicate EngineeringOS

duplicate APIs

duplicate Timeline

duplicate ECP
----------------------------------------------------
## Mandatory Rules

Never overwrite existing architecture.

Never delete working modules.

Never replace EngineeringOS.

Always extend existing implementation.

Prefer incremental changes.

Preserve backward compatibility whenever practical.

----------------------------------------------------

## Development Rules

Reuse existing code.

Reuse EngineeringOS.

Reuse Promotion.

Reuse Gates.

No architecture rewrite.

Small incremental changes only.

----------------------------------------------------
## Resume Package

When resuming work:

Read in this order:

1. AGENTS.md
2. ENGINEERINGOS.ID
3. ENGINEERINGOS.json
4. AI_CAPABILITY_MATRIX.md
5. ENGINEERING_CONSTITUTION.md

Then inspect:

- Latest Engineering Checkpoint (ECP)
- Latest verified 3R
- Current repository state

Only then begin implementation.

----------------------------------------------------
## Decision Tree

Repository Verified?

YES → Continue

NO → STOP

Workspace Locked?

YES → STOP

Build PASS?

YES → Continue

NO → Fix compile errors only
----------------------------------------------------
## Before Finish

Build PASS

No TypeScript errors

No duplicate code

No merge conflicts

----------------------------------------------------
## Verify Repository

### Required Folders

app/

components/

lib/

hooks/

supabase/

ecp/

### Required Bootstrap Files

AGENTS.md

ENGINEERINGOS.ID

ENGINEERINGOS.json

AI_CAPABILITY_MATRIX.md

ENGINEERING_CONSTITUTION.md

If any required folder or bootstrap file is missing:

STOP.

Report:

Wrong repository attached.

Do not create replacement architecture.

----------------------------------------------------

## EngineeringOS Resume

Resume Priority

1. Current Repository
2. Latest Engineering Checkpoint (ECP)
3. Latest Verified 3R
4. GitHub
5. Supabase

Never resume from assumptions.

Always resume from verified engineering state.

----------------------------------------------------
## Engineering Rules

Never create

src/

duplicate APIs

duplicate EngineeringOS

duplicate Timeline

duplicate Promotion

duplicate Gates

Always reuse existing implementation.
----------------------------------------------------
## AI Environment Detection

If current workspace differs from:

ENGINEERINGOS.ID

or

ENGINEERINGOS.json

Stop immediately.

Never simulate FBOS.

Never generate fake project structures.

Report:

Wrong repository attached.
----------------------------------------------------
## Source of Truth (Priority)

1. Current Repository

2. Engineering Checkpoint (ECP)

3. Latest Verified 3R

4. GitHub

5. Supabase

Never resume from assumptions.

Always inspect the repository before writing code.

----------------------------------------------------
## Document Status

Status: STABLE

Version: 1.0

Owner: EngineeringOS

Last Approved: 2026-06-30

Changes to this document must be versioned and recorded in the project changelog.

Version Policy

Major version:

Architecture or governance changes.

Minor version:

Rule additions.

Patch version:

Formatting or wording improvements.