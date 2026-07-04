import { join } from "node:path";
import { bootstrapEngineeringOS } from "./bootstrap";
import { findRepoRoot, isMainModule, writeJsonFile } from "./config";
import { getRuntimeStatus } from "./runtime";
import { writeResumePackage } from "./resume-engine";
import { runValidation } from "./validation-engine";
import { syncSprintTasks } from "./task-engine";
import { getRepositoryState } from "./repository-integration";
import { getSupabaseIntegrationStatus, syncHandoffStub } from "./supabase-integration";

type FinalAcceptanceStatus = "VERIFIED" | "NOT VERIFIED";

export interface EngineeringDashboardData {
  generatedAt: string;
  bootstrap: ReturnType<typeof bootstrapEngineeringOS>;
  runtime: ReturnType<typeof getRuntimeStatus>;
  validation: ReturnType<typeof runValidation>;
  resume: ReturnType<typeof writeResumePackage>;
  tasks: ReturnType<typeof syncSprintTasks>;
  repository: ReturnType<typeof getRepositoryState>;
  supabase: ReturnType<typeof getSupabaseIntegrationStatus>;
  finalAcceptance: {
    status: FinalAcceptanceStatus;
    readyFor3R: boolean;
    latestEcp: string | null;
    latestEcpState: string | null;
    reason: string;
  };
}

function getLatestEcpSummary(resume: ReturnType<typeof writeResumePackage>) {
  const checkpoint = resume.latestCheckpoint;

  if (!checkpoint || typeof checkpoint !== "object") {
    return {
      latestEcp: null,
      latestEcpState: null,
    };
  }

  return {
    latestEcp: "id" in checkpoint && typeof checkpoint.id === "string" ? checkpoint.id : null,
    latestEcpState: "state" in checkpoint && typeof checkpoint.state === "string" ? checkpoint.state : null,
  };
}

export function getEngineeringDashboardData(repoRoot = findRepoRoot()): EngineeringDashboardData {
  const bootstrap = bootstrapEngineeringOS(repoRoot);
  const runtime = getRuntimeStatus();
  const validation = runValidation(repoRoot);
  const resume = writeResumePackage(repoRoot);
  const tasks = syncSprintTasks(repoRoot);
  const repository = getRepositoryState(repoRoot);
  const supabase = getSupabaseIntegrationStatus(repoRoot);
  const latestEcpSummary = getLatestEcpSummary(resume);
  const verified = validation.status === "PASS";
  const readyFor3R =
    verified &&
    (latestEcpSummary.latestEcpState === "READY_FOR_3R" ||
      latestEcpSummary.latestEcpState === "PROMOTED_TO_3R");

  const data: EngineeringDashboardData = {
    generatedAt: new Date().toISOString(),
    bootstrap,
    runtime,
    validation,
    resume,
    tasks,
    repository,
    supabase,
    finalAcceptance: {
      status: verified ? "VERIFIED" : "NOT VERIFIED",
      readyFor3R,
      ...latestEcpSummary,
      reason: readyFor3R
        ? "EngineeringOS validation passed and the latest ECP is ready for 3R."
        : verified
          ? "EngineeringOS validation passed; latest ECP is not marked READY_FOR_3R yet."
          : "EngineeringOS validation has not passed.",
    },
  };

  syncHandoffStub(repoRoot);
  writeJsonFile(join(repoRoot, "engineeringos", "reports", "dashboard-snapshot.json"), data);
  return data;
}

if (isMainModule(import.meta.url)) {
  const data = getEngineeringDashboardData();
  console.log(JSON.stringify(data, null, 2));
  process.exitCode = data.validation.status === "FAIL" ? 1 : 0;
}
