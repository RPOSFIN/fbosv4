export * from "./automation-engine";
export * from "./bootstrap";
export * from "./config";
export * from "./context-loader";
export * from "./dashboard-data";
export * from "./logger";
export * from "./production-package";
export * from "./repository-integration";
export * from "./resume-engine";
export * from "./runtime";
export * from "./supabase-integration";
export * from "./task-engine";
export * from "./types";
export * from "./validation-engine";

import { writeAutomationPlan } from "./automation-engine";
import { bootstrapEngineeringOS } from "./bootstrap";
import { isMainModule, normalizeError } from "./config";
import { getEngineeringDashboardData } from "./dashboard-data";
import { generateProductionPackage } from "./production-package";
import { writeResumePackage } from "./resume-engine";
import { startRuntime, stopRuntime } from "./runtime";
import { syncHandoffStub } from "./supabase-integration";
import { syncSprintTasks } from "./task-engine";
import { runValidation } from "./validation-engine";

async function runCli(command: string): Promise<unknown> {
  switch (command) {
    case "bootstrap":
      return bootstrapEngineeringOS();
    case "runtime:start":
    case "runtime":
      return startRuntime();
    case "runtime:stop":
      return stopRuntime();
    case "validate":
      return runValidation();
    case "resume":
      return writeResumePackage();
    case "dashboard":
      return getEngineeringDashboardData();
    case "tasks":
      return syncSprintTasks();
    case "supabase":
      return syncHandoffStub();
    case "automation":
      return writeAutomationPlan();
    case "package":
      return generateProductionPackage();
    default:
      return getEngineeringDashboardData();
  }
}

if (isMainModule(import.meta.url)) {
  const command = process.argv[2] ?? "dashboard";

  runCli(command)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(normalizeError(error));
      process.exitCode = 1;
    });
}
