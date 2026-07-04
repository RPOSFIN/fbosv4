param (
    [string]$Sprint = "",
    [switch]$Validate,
    [switch]$Resume,
    [switch]$Dashboard
)

$ErrorActionPreference = "Stop"

function Write-ResultLine {
    param(
        [string]$Label,
        [string]$Status,
        [string]$Detail
    )

    Write-Host ("{0,-24} {1,-8} {2}" -f $Label, $Status, $Detail)
}

function Invoke-EngineeringOSCommand {
    param(
        [string]$RepoRoot,
        [string]$Command
    )

    $LocalTsx = Join-Path $RepoRoot "node_modules\.bin\tsx.cmd"
    $KernelIndex = Join-Path $RepoRoot "engineeringos\kernel\index.ts"
    $script:EngineeringOSLastExitCode = 0

    if (Test-Path -LiteralPath $LocalTsx) {
        & $LocalTsx $KernelIndex $Command 2>&1 | ForEach-Object {
            Write-Host $_
        }
        $script:EngineeringOSLastExitCode = $LASTEXITCODE
        return
    }

    $Npx = Get-Command "npx.cmd" -ErrorAction SilentlyContinue
    if ($null -eq $Npx) {
        throw "tsx.cmd was not found and npx.cmd is unavailable."
    }

    & $Npx.Source "--no-install" "tsx" $KernelIndex $Command 2>&1 | ForEach-Object {
        Write-Host $_
    }
    $script:EngineeringOSLastExitCode = $LASTEXITCODE
}

$ScriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $ScriptDir = (Get-Location).Path
}

$RepoRoot = $ScriptDir
$PackageJson = Join-Path $RepoRoot "package.json"
$EngineeringOSRoot = Join-Path $RepoRoot "engineeringos"
$KernelRoot = Join-Path $EngineeringOSRoot "kernel"
$ReportsRoot = Join-Path $EngineeringOSRoot "reports"

if (-not (Test-Path -LiteralPath $ReportsRoot)) {
    New-Item -ItemType Directory -Path $ReportsRoot -Force | Out-Null
}

$RepoPass = Test-Path -LiteralPath $PackageJson
$KernelPass = Test-Path -LiteralPath $KernelRoot
$Git = Get-Command "git.exe" -ErrorAction SilentlyContinue
$GitPass = $null -ne $Git
$Branch = "unknown"

if ($RepoPass -and $GitPass) {
    try {
        $Branch = & $Git.Source -C $RepoRoot branch --show-current
    } catch {
        $Branch = "unknown"
    }
}

$RepoStatus = "FAIL"
if ($RepoPass) {
    $RepoStatus = "PASS"
}

$KernelStatus = "FAIL"
if ($KernelPass) {
    $KernelStatus = "PASS"
}

$GitStatus = "FAIL"
if ($GitPass) {
    $GitStatus = "PASS"
}

Write-ResultLine "Repository" $RepoStatus $RepoRoot
Write-ResultLine "Kernel" $KernelStatus $KernelRoot
Write-ResultLine "Git" $GitStatus $Branch

if (-not $RepoPass) {
    throw "package.json was not found. Wrong repository attached."
}

if (-not $KernelPass) {
    throw "engineeringos\kernel was not found. Wrong repository attached."
}

$Commands = New-Object System.Collections.Generic.List[string]

if ($Sprint -eq "E02") {
    $Commands.Add("bootstrap")
}

if ($Sprint -eq "E02-E12") {
    $Commands.Add("package")
}

if ($Validate) {
    $Commands.Add("validate")
}

if ($Resume) {
    $Commands.Add("resume")
}

if ($Dashboard) {
    $Commands.Add("dashboard")
}

if ($Commands.Count -eq 0) {
    $Commands.Add("validate")
}

Push-Location -LiteralPath $RepoRoot
try {
    foreach ($Command in $Commands) {
        Write-ResultLine "EngineeringOS" "RUN" $Command
        Invoke-EngineeringOSCommand -RepoRoot $RepoRoot -Command $Command
        if ($script:EngineeringOSLastExitCode -ne 0) {
            throw "EngineeringOS command failed: $Command"
        }
    }
} finally {
    Pop-Location
}

$InstallerReport = [PSCustomObject]@{
    GeneratedAt = Get-Date -Format "o"
    RepoRoot = $RepoRoot
    Branch = $Branch
    Sprint = $Sprint
    Validate = [bool]$Validate
    Resume = [bool]$Resume
    Dashboard = [bool]$Dashboard
    Result = "PASS"
}

$InstallerReportPath = Join-Path $ReportsRoot "installer-report.json"
$InstallerReport | ConvertTo-Json -Depth 6 | Out-File -FilePath $InstallerReportPath -Encoding utf8

Write-ResultLine "Installer" "PASS" $InstallerReportPath
