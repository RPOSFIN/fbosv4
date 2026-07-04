import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  SPRINT_IDS,
  findRepoRoot,
  isMainModule,
  writeJsonFile,
  writeTextFile,
} from "./config";
import { writeAutomationPlan } from "./automation-engine";
import { getEngineeringDashboardData } from "./dashboard-data";
import { runValidation } from "./validation-engine";

type SprintStatus = {
  sprint: string;
  status: "COMPLETE" | "MISSING";
  evidence: string[];
};

const SPRINT_EVIDENCE: Record<string, string[]> = {
  E02: [
    "engineeringos/kernel/bootstrap.ts",
    "engineeringos/kernel/logger.ts",
    "engineeringos/kernel/config.ts",
    "engineeringos/kernel/index.ts",
  ],
  E03: ["engineeringos/kernel/runtime.ts"],
  E04: ["engineeringos/kernel/context-loader.ts"],
  E05: [
    "engineeringos/kernel/resume-engine.ts",
    "engineeringos/reports/latest-resume-package.json",
  ],
  E06: [
    "engineeringos/kernel/validation-engine.ts",
    "engineeringos/reports/validation-result.json",
  ],
  E07: [
    "engineeringos/kernel/task-engine.ts",
    "engineeringos/reports/task-state.json",
  ],
  E08: ["engineeringos/kernel/repository-integration.ts"],
  E09: [
    "engineeringos/kernel/supabase-integration.ts",
    "engineeringos/reports/supabase-integration-status.json",
  ],
  E10: [
    "engineeringos/kernel/dashboard-data.ts",
    "engineeringos/reports/dashboard-snapshot.json",
  ],
  E11: [
    "engineeringos/kernel/automation-engine.ts",
    "engineeringos/reports/automation-plan.md",
  ],
  E12: [
    "engineeringos/kernel/production-package.ts",
  ],
};

function getSprintStatuses(repoRoot: string): SprintStatus[] {
  return SPRINT_IDS.map((sprint) => {
    const evidence = SPRINT_EVIDENCE[sprint] ?? [];
    const missing = evidence.filter((filePath) => !existsSync(join(repoRoot, filePath)));

    return {
      sprint,
      status: missing.length ? "MISSING" : "COMPLETE",
      evidence,
    };
  });
}

export function generateProductionPackage(repoRoot = findRepoRoot()) {
  const dashboard = getEngineeringDashboardData(repoRoot);
  const validation = runValidation(repoRoot);
  const automationPlan = writeAutomationPlan(repoRoot);
  const sprintStatuses = getSprintStatuses(repoRoot);
  const missingItems = [
    ...validation.missingItems,
    ...sprintStatuses
      .filter((item) => item.status === "MISSING")
      .map((item) => `${item.sprint}: missing evidence`),
  ];
  const recommendation =
    validation.status === "PASS" && missingItems.length === 0
      ? "EngineeringOS E02-E12 is ready for final build/database verification before the next FBOS module sprint."
      : "Resolve listed missing items before starting the next FBOS module sprint.";

  const packageData = {
    generatedAt: new Date().toISOString(),
    sprintStatuses,
    validation,
    automationPlan,
    dashboardSummary: {
      bootstrap: dashboard.bootstrap.status,
      validation: dashboard.validation.status,
      runtime: dashboard.runtime.lifecycle,
      supabase: dashboard.supabase.state,
      gitClean: dashboard.repository.gitClean,
      finalAcceptance: dashboard.finalAcceptance.status,
      readyFor3R: dashboard.finalAcceptance.readyFor3R,
    },
    missingItems,
    recommendation,
  };

  const lines = [
    "# E02-E12 Production Package",
    "",
    `Generated: ${packageData.generatedAt}`,
    "",
    "## Sprint Statuses",
    "",
    ...sprintStatuses.map((item) => `- ${item.sprint}: ${item.status} (${item.evidence.join(", ")})`),
    "",
    "## Validation Summary",
    "",
    `- Overall: ${validation.status}`,
    ...validation.checks.map((item) => `- ${item.name}: ${item.status} - ${item.detail}`),
    "",
    "## Missing Items",
    "",
    ...(missingItems.length ? missingItems.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Next FBOS Sprint Recommendation",
    "",
    recommendation,
    "",
  ];

  writeTextFile(join(repoRoot, "engineeringos", "reports", "E02_E12_PRODUCTION_PACKAGE.md"), lines.join("\n"));
  writeJsonFile(join(repoRoot, "engineeringos", "reports", "E02_E12_SPRINT_EVIDENCE.json"), packageData);

  return packageData;
}

if (isMainModule(import.meta.url)) {
  const packageData = generateProductionPackage();
  console.log(JSON.stringify(packageData, null, 2));
  process.exitCode = packageData.validation.status === "FAIL" ? 1 : 0;
}
