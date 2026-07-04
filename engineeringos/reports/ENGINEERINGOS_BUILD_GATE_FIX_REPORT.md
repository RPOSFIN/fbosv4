# EngineeringOS Build-Gate Fix Report

Generated: 2026-07-04

## Root Cause

The live dashboard uses `/api/engineering/verify`, which calls `verifyLatest()` and then `runGates()`.

The `build` gate in `lib/engineering/gates.ts` previously executed the extensionless Windows shim:

```text
node_modules/.bin/tsc --noEmit
```

That is fragile on Windows. This repository path contains spaces, and direct execution through the extensionless shim caused the live gate to fail even though `npm.cmd run typecheck` passed.

## Files Changed

- `lib/engineering/gates.ts`
- `engineeringos/reports/ENGINEERINGOS_BUILD_GATE_FIX_REPORT.md`

Running the real `Verify & Auto Promote` route also triggered the existing promotion flow, which updated EngineeringOS state files and handoff docs:

- `ecp/ECP-0006.json`
- `ecp/3r.json`
- `ecp/timeline.json`
- `ecp/ECP-0003.json`
- `docs/02_PROJECT_STATUS.md`
- `docs/03_HANDOFF.md`

## Exact Command Fixed

Windows build gate now runs:

```text
npx.cmd --no-install tsc --noEmit
```

macOS/Linux path remains:

```text
node_modules/.bin/tsc --noEmit
```

## Validation Results

- `npm.cmd run typecheck` - PASS
- `npm.cmd run build` - PASS
- Live `/api/engineering/verify` - PASS

Live gate result:

- build: PASS - `npx.cmd --no-install tsc --noEmit: 0 errors`
- runtime: PASS
- api: PASS
- database: PASS
- route: PASS
- console: PASS

## Final Dashboard State

Observed from `/api/engineering/verify` and `/api/engineering/info`:

- Build: PASS
- EngineeringOS verification: PASS / HEALTHY
- Promotion blocked: false
- Ready for 3R: YES
- Current state: `PROMOTED_TO_3R`

Note: The requested target state was `READY_FOR_3R`, but `ecp/config.json` is absent, so `readConfig()` defaults `autoPromote` to `true`. Therefore the real dashboard button flow auto-promoted ECP-0006 after all gates passed. I did not force the state back to `READY_FOR_3R` because that would rewrite the result of a successful real gate run.

## Remaining Observation

The existing promotion logic wrote `ecp/3r.json` for `3r-fbos4-2026-07-04-ecp-0006`, but `git tag --list '3r-fbos4-2026-07-04-ecp-0006*'` did not show the tag. The existing `git()` helper swallows git command errors, so tag creation failure is not surfaced. This was not changed because the requested fix was limited to the live build gate.

## GO / NO-GO

GO for FBOS modules.

The live build gate now passes through the dashboard verification route.
