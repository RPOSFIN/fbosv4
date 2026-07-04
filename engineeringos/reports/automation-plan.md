# EngineeringOS Automation Plan

Generated: 2026-07-04T13:00:01.646Z

Mode: SAFE_PLAN_ONLY

## Recommended Commands

- `npm.cmd run engineeringos:validate`
- `npm.cmd run engineeringos:resume`
- `npm.cmd run engineeringos:dashboard`
- `npm.cmd run engineeringos:package`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run db:verify`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\engineeringos-installer.ps1 -Validate -Resume -Dashboard`

## Notes

- This plan does not run destructive git commands.
- This plan does not run Supabase migrations.
- This plan uses Windows PowerShell compatible commands.
- Repository root: D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1
