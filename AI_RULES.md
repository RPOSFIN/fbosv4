# AI_RULES — FBOS V4

Non-negotiable rules for every AI agent (Cursor, Arena, Gemini, ChatGPT, …) and human
engineer working in this repository. Read this **before** writing any code.

---

## 1. Resume from the repository, never from chat
The canonical engineering memory is, in order:
`README.md` → `AI_RULES.md` → `docs/00_READ_FIRST.md` → `docs/01_ENGINEERING_MANIFEST.md` →
`docs/02_PROJECT_STATUS.md` → `docs/03_HANDOFF.md`.
Do not rely on previous chat history. If reality conflicts with these docs, **update the doc**.

## 2. This is Next.js 16 — not the one you remember
APIs, conventions, and file structure differ from older Next.js. Read
`node_modules/next/dist/docs/` for the relevant area before editing app code. Heed deprecations.

## 3. Work only inside this repository
Repo: `RPOSFIN/fbosv4`. Do **not** create new projects, sandboxes, Vite/`src` templates, or
helper repos. Do **not** redesign the architecture. Active branch: `cursor/data-population-0d65`.

## 4. Governance is frozen — no duplicate docs
The files in Rule 1 plus `PROJECT.lock` are the only governance documents. **Merge** new
information into them; never create parallel/competing status, backup, or handoff files.
Obsolete docs go to `docs/archive/`; large dumps go to `backups/`.

## 5. Incremental, backup-first development
- One small, testable change per step; verify on `http://localhost:3000` before the next.
- Commit after each working step with a clear message.
- Before any risky refactor or a merge to `main`, create a **checkpoint first**
  (git tag/branch, e.g. `backup/<name>-<date>`), then proceed. This is the "3R" (Restore /
  Recovery / Rollback) discipline.
- Rollback = `git checkout <backup-branch>` or `git reset --hard <checkpoint-sha>`.

## 6. Keep the build green
`npm run build` must pass before committing app-code changes. Don't commit known build breaks;
if one exists, fixing it is the top priority (see `docs/02_PROJECT_STATUS.md`).

## 7. Secrets stay out of git
`.env.local` is never committed (Supabase/ClickUp/Tally/Google keys). Don't paste secret
values into docs or code.

## 8. Changes that need explicit approval
Do not, without separate owner approval: re-enable auth (`isAuthDisabled`), change middleware,
run/author Supabase migrations against production, or set up deploy/CI.

## 9. Tooling pointers
`AGENTS.md` and `CLAUDE.md` exist for tool auto-loading and defer to this file. Keep them thin;
put real rules here.
