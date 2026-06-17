# Helper: print chunk index and first 40 chars for verification
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
for ($i = 0; $i -le 7; $i++) {
  $f = Join-Path $dir "_b64_cdp_$i.txt"
  $c = Get-Content $f -Raw
  Write-Output "chunk $i len=$($c.Length) start=$($c.Substring(0, [Math]::Min(40, $c.Length)))"
}
$fin = Get-Content (Join-Path $dir "_b64_cdp_fin.txt") -Raw
Write-Output "fin len=$($fin.Length)"
