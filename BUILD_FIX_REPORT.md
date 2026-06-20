# BUILD FIX REPORT — MOCK_USER TypeScript Error

**Date:** 2026-06-20  
**Branch:** `cursor/mock-user-ts-fix-0d65`  
**Scope:** Fix only `lib/auth/config.ts:15` — `MOCK_USER.name` type error

---

## Root cause

`MOCK_USER` in `lib/auth/disabled.ts` was defined with only `id` and `email`:

```typescript
export const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "demo@fbos.local",
};
```

Consumers expected a fuller mock profile shape:

| File | Property accessed |
|---|---|
| `lib/auth/config.ts:15` | `MOCK_USER.name` → `full_name` in `MOCK_SESSION_RESPONSE` |
| `lib/auth/config.ts:23` | `MOCK_USER.name` → `fullName` in `MOCK_AUTH_CONTEXT` |
| `lib/use-auth.tsx:53` | `MOCK_USER.role` |
| `lib/use-auth.tsx:54` | `MOCK_USER.name` |

TypeScript inferred `{ id: string; email: string }`, so `name` and `role` were not valid properties.

**Fix:** Extend `MOCK_USER` with the fields callers already use, typed explicitly via a `MockUser` interface and `FbosRole` — no `any`, no suppressions, no auth/runtime behavior change (`isAuthDisabled()` unchanged).

---

## Files changed

| File | Change |
|---|---|
| `lib/auth/disabled.ts` | Added `MockUser` type; added `name` and `role` to `MOCK_USER` |

No other files modified.

---

## Verification

### `npx tsc --noEmit`

**MOCK_USER errors:** ✅ **RESOLVED** (4 errors cleared)

**Remaining errors on `main` (out of scope for this fix):** 7

```
lib/integrations/gsheet-hub.ts — tabs.operations / tabs.finance (6 errors)
lib/integrations/gsheet.ts:567 — getGSheetFixSteps argument mismatch (1 error)
```

### `npm run build`

**Result:** ❌ **FAIL** — blocked by remaining gsheet TypeScript errors (not MOCK_USER)

First failing line after this fix:

```
./lib/integrations/gsheet-hub.ts:271:12
Property 'operations' does not exist on type '{ leads: string; ... }'
```

---

## Summary

| Check | MOCK_USER fix | Full build |
|---|---|---|
| `npx tsc --noEmit` | Target errors fixed | 7 unrelated errors remain |
| `npm run build` | — | FAIL (gsheet-hub.ts) |

The reported P0 error at `lib/auth/config.ts:15` is **fixed**. Full green build requires separate fixes for `google-config.ts` / `gsheet-hub.ts` / `gsheet.ts`.

---

## ⛔ Stopped — awaiting further instruction.
