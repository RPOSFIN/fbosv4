import { join } from "node:path";
import { findRepoRoot, isMainModule, writeTextFile } from "./config";

export interface AutomationPlan {
  generatedAt: string;
  mode: "SAFE_PLAN_ONLY";
  commands: string[];
  notes: string[];
}

export function generateAutomationPlan(repoRoot = findRepoRoot()): AutomationPlan {
  return {
    generatedAt: new Date().toISOString(),
    mode: "SAFE_PLAN_ONLY",
    commands: [
      "npm.cmd run engineeringos:validate",
      "npm.cmd run engineeringos:resume",
      "npm.cmd run engineeringos:dashboard",
      "npm.cmd run engineeringos:package",
      "npm.cmd run typecheck",
      "npm.cmd run build",
      "npm.cmd run db:verify",
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\engineeringos-installer.ps1 -Validate -Resume -Dashboard",
    ],
    notes: [
      "This plan does not run destructive git commands.",
      "This plan does not run Supabase migrations.",
      "This plan uses Windows PowerShell compatible commands.",
      `Repository root: ${repoRoot}`,
    ],
  };
}

export function writeAutomationPlan(repoRoot = findRepoRoot()): AutomationPlan {
  const plan = generateAutomationPlan(repoRoot);
  const body = [
    "# EngineeringOS Automation Plan",
    "",
    `Generated: ${plan.generatedAt}`,
    "",
    `Mode: ${plan.mode}`,
    "",
    "## Recommended Commands",
    "",
    ...plan.commands.map((command) => `- \`${command}\``),
    "",
    "## Notes",
    "",
    ...plan.notes.map((note) => `- ${note}`),
    "",
  ].join("\n");

  writeTextFile(join(repoRoot, "engineeringos", "reports", "automation-plan.md"), body);
  return plan;
}

if (isMainModule(import.meta.url)) {
  const plan = writeAutomationPlan();
  console.log(JSON.stringify(plan, null, 2));
}
