$root = "engineeringos"

$structure = @{
    "phase-0" = @(
        "VISION.md",
        "SCOPE.md",
        "ACTORS.md",
        "PRINCIPLES.md",
        "CONSTITUTION_FREEZE.md"
    )
    "phase-1" = @(
        "ARCHITECTURE.md",
        "EXECUTION_FLOW.md",
        "DEPENDENCY_MODEL.md",
        "DIRECTORY_PHILOSOPHY.md",
        "ARCHITECTURE_FREEZE.md"
    )
    "phase-2" = @(
        "RUNTIME_PHILOSOPHY.md",
        "AGENT_LIFECYCLE.md",
        "BOOTSTRAP.md",
        "STATE_MODEL.md",
        "CAPABILITY_DISCOVERY.md",
        "CAPABILITY_NEGOTIATION.md",
        "RESUME_MODEL.md",
        "RUNTIME_BOUNDARIES.md",
        "RUNTIME_FREEZE.md"
    )
    "phase-3" = @(
        "GOVERNANCE_PHILOSOPHY.md",
        "DECISION_MODEL.md",
        "APPROVAL_MODEL.md",
        "REVIEW_MODEL.md",
        "PROMOTION_MODEL.md",
        "ROLLBACK_MODEL.md",
        "AMENDMENT_MODEL.md",
        "GOVERNANCE_BOUNDARIES.md",
        "GOVERNANCE_FREEZE.md"
    )
}

foreach ($phase in $structure.Keys) {

    $folder = Join-Path $root $phase

    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }

    foreach ($doc in $structure[$phase]) {

        $file = Join-Path $folder $doc

        if (!(Test-Path $file)) {

            @"
# $($doc.Replace(".md",""))

Status: Placeholder

"@ | Set-Content $file -Encoding UTF8

            Write-Host "[CREATED] $file"
        }
        else {

            Write-Host "[SKIPPED] $file"

        }
    }
}

Write-Host ""
Write-Host "EngineeringOS bootstrap completed."