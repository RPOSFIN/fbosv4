# Writes hub secrets to CONFIG tab via clipboard helper — run once if Apps Script properties blocked
$envFile = Join-Path $PSScriptRoot ".." ".env.local"
$lines = Get-Content $envFile | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
$map = @{
  "SUPABASE_URL" = "NEXT_PUBLIC_SUPABASE_URL"
  "SUPABASE_SERVICE_KEY" = "SUPABASE_SERVICE_ROLE_KEY"
  "SPREADSHEET_ID" = "GOOGLE_SHEET_ID"
  "SHEET_SYNC_SECRET" = "SHEET_SYNC_SECRET"
  "SYNC_SECRET" = "SHEET_SYNC_SECRET"
  "CLICKUP_API_TOKEN" = "CLICKUP_API_TOKEN"
  "CLICKUP_LIST_ID" = "CLICKUP_LIST_ID"
  "GOOGLE_WEBAPP_URL" = "GOOGLE_WEBAPP_URL"
}
$vals = @{}
foreach ($line in $lines) {
  $i = $line.IndexOf("=")
  $k = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1)
  $vals[$k] = $v
}
Write-Host "Open CONFIG tab and paste these rows (Col A = key, Col B = value):"
Write-Host "https://docs.google.com/spreadsheets/d/1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI/edit#gid=639805728"
Write-Host ""
foreach ($canonical in $map.Keys) {
  $src = $map[$canonical]
  if ($vals.ContainsKey($src)) {
    Write-Host "$canonical`t(tap to copy value next)"
  }
}
Write-Host ""
Write-Host "Then Apps Script Run: setupAllFbosHub"
