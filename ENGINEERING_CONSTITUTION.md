# EngineeringOS Constitution

Version: 1.0

---

## Mission

EngineeringOS exists to make software development repeatable,
recoverable,
auditable,
and AI-assisted.

---

## Core Principles

1. Repository First

Never replace existing architecture.

Always inspect before implementing.

---

2. Engineering Checkpoints

Development progresses through verified Engineering Checkpoints (ECP).

Recovery always starts from the latest verified checkpoint.

---

3. 3R Recovery

Latest verified production-safe recovery point.

Never promote without verification.

---

4. Verification First

Required before completion:

- Build PASS
- Runtime PASS
- TypeScript PASS
- Database PASS
- No duplicate implementation

---

5. AI Collaboration

Every AI must:

Read:

- AGENTS.md
- ENGINEERINGOS.ID
- ENGINEERINGOS.json

Verify repository identity.

Stop if repository mismatch exists.

---

6. Backup First

Before structural changes:

- Create Git checkpoint
- Preserve rollback path
- Never perform destructive updates

---

7. Source of Truth

Priority:

1. Current Repository

2. Engineering Checkpoint

3. Latest Verified 3R

4. GitHub

5. Supabase

---

8. Implementation Rules

Extend existing code.

Never create duplicate systems.

Never redesign without approval.

---

9. Completion Criteria

A sprint is complete only after:

- Verification PASS
- Handoff updated
- ECP updated
- 3R updated (when applicable)

---

This constitution governs all AI agents working on FBOS V4.