import { join } from "node:path";
import { findRepoRoot, isMainModule, writeJsonFile } from "./config";
import { loadEngineeringContext } from "./context-loader";
import { getRepositoryState } from "./repository-integration";

export interface ResumePackage {
  generatedAt: string;
  branch: string;
  gitClean: boolean;
  gitStatus: string[];
  latestCheckpoint: unknown | null;
  latestSprintStatus: string;
  moduleContext: {
    docsLoaded: number;
    ecpRecords: number;
    timelineEvents: number;
    requiredFoldersPresent: boolean;
  };
  context: ReturnType<typeof loadEngineeringContext>;
}

function readSprintStatus(latestCheckpoint: unknown): string {
  if (latestCheckpoint && typeof latestCheckpoint === "object") {
    const sprint = "sprint" in latestCheckpoint ? latestCheckpoint.sprint : null;
    const state = "state" in latestCheckpoint ? latestCheckpoint.state : null;

    if (typeof sprint === "string" && typeof state === "string") {
      return `${sprint} (${state})`;
    }

    if (typeof sprint === "string") {
      return sprint;
    }
  }

  return "unknown";
}

export function buildResumePackage(repoRoot = findRepoRoot()): ResumePackage {
  const context = loadEngineeringContext(repoRoot);
  const repository = getRepositoryState(repoRoot);

  return {
    generatedAt: new Date().toISOString(),
    branch: repository.branch,
    gitClean: repository.gitClean,
    gitStatus: repository.gitStatus,
    latestCheckpoint: context.ecp.latestRecord,
    latestSprintStatus: readSprintStatus(context.ecp.latestRecord),
    moduleContext: {
      docsLoaded: context.docs.length,
      ecpRecords: context.ecp.files.length,
      timelineEvents: context.ecp.timelineEvents.length,
      requiredFoldersPresent: context.structure.requiredRootFolders.every((folder) => folder.exists),
    },
    context,
  };
}

export function writeResumePackage(repoRoot = findRepoRoot()): ResumePackage {
  const resumePackage = buildResumePackage(repoRoot);
  writeJsonFile(join(repoRoot, "engineeringos", "reports", "latest-resume-package.json"), resumePackage);
  return resumePackage;
}

if (isMainModule(import.meta.url)) {
  const resumePackage = writeResumePackage();
  console.log(JSON.stringify(resumePackage, null, 2));
}
