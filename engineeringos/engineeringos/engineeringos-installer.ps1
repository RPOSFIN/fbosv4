param (
    [switch]$DryRun,
    [string]$Sprint = "E01"
)

$ErrorActionPreference = "Stop"

function Write-ResultLine {
    param([string]$Label, [string]$Status, [string]$Detail)
    Write-Host ("{0,-20} .... {1} {2}" -f $Label, $Status, $Detail)
}

# Resolve script location
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# This script lives at:
# repo/engineeringos/engineeringos/engineeringos-installer.ps1
# So repo root is two levels up.
$EngineeringOSRoot = Split-Path $ScriptDir -Parent
$RepoRoot = Split-Path $EngineeringOSRoot -Parent

$ReportsDir = Join-Path $EngineeringOSRoot "reports"
$KernelDir = Join-Path $EngineeringOSRoot "kernel"

if (-not (Test-Path $ReportsDir)) {
    New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null
}

$RepoPass = Test-Path (Join-Path $RepoRoot ".git")
$GitPass = (Get-Command "git" -ErrorAction SilentlyContinue) -ne $null
$Branch = "NONE"
$BranchPass = $false

if ($GitPass -and $RepoPass) {
    try {
        $Branch = git -C "$RepoRoot" rev-parse --abbrev-ref HEAD
        if ($Branch -eq "fbosv4-recovery") {
            $BranchPass = $true
        }
    } catch {
        $Branch = "ERROR"
    }
}

$StatusRepo = if ($RepoPass) { "PASS" } else { "FAIL" }
$StatusGit = if ($GitPass) { "PASS" } else { "FAIL" }
$StatusBranch = if ($BranchPass) { "PASS" } else { "FAIL" }
$StatusEngOS = if (Test-Path $EngineeringOSRoot) { "PASS" } else { "FAIL" }
$StatusKernel = if (Test-Path $KernelDir) { "PASS" } else { "FAIL" }

Write-ResultLine "Repository" $StatusRepo $RepoRoot
Write-ResultLine "Git" $StatusGit ""
Write-ResultLine "Branch" $StatusBranch $Branch
Write-ResultLine "EngineeringOS" $StatusEngOS $EngineeringOSRoot
Write-ResultLine "Kernel" $StatusKernel $KernelDir

if (-not ($RepoPass -and $GitPass -and $BranchPass -and (Test-Path $KernelDir))) {
    Write-Host "Result ............ FAIL"
    exit 1
}

$ExecutionStatus = if ($DryRun) {
    "DRY RUN"
} else {
    $TestFile = Join-Path $KernelDir "INSTALLER_POC_TEST.txt"
    "Installer Test - $(Get-Date)" | Out-File -FilePath $TestFile -Encoding utf8
    "SUCCESS"
}

$ReportObj = [PSCustomObject]@{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    RepoPath = $RepoRoot
    EngineeringOSRoot = $EngineeringOSRoot
    KernelPath = $KernelDir
    Branch = $Branch
    Sprint = $Sprint
    Result = $ExecutionStatus
}

$ReportObj | ConvertTo-Json | Out-File -FilePath (Join-Path $ReportsDir "installer-report.json") -Encoding utf8
"Installer Log - $(Get-Date) - Sprint: $Sprint - Status: $ExecutionStatus" | Out-File -FilePath (Join-Path $ReportsDir "installer.log") -Encoding utf8

Write-ResultLine "Dry Run" "PASS" ""
Write-ResultLine "Report" "PASS" $ReportsDir
Write-Host "Result ............ $ExecutionStatus"
