import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  findRepoRoot,
  getEngineeringOSRoot,
  getFileInfo,
  isMainModule,
  listFilesRecursive,
  readJsonFile,
  safeReadText,
  toRepoRelative,
  writeJsonFile,
} from "./config";

export interface EngineeringDoc {
  path: string;
  title: string;
  bytes: number;
  content: string;
}

export interface EngineeringContextPackage {
  generatedAt: string;
  repoRoot: string;
  structure: {
    requiredRootFolders: Array<{ path: string; exists: boolean }>;
    importantFiles: ReturnType<typeof getFileInfo>[];
  };
  docs: EngineeringDoc[];
  ecp: {
    timelineExists: boolean;
    timelineEvents: unknown[];
    latestRecord: unknown | null;
    latestRecordPath: string | null;
    files: string[];
  };
}

function getTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function loadEngineeringDocs(repoRoot: string): EngineeringDoc[] {
  const engineeringOSRoot = getEngineeringOSRoot(repoRoot);
  const docRoots = readdirSync(engineeringOSRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^phase-\d+$/i.test(entry.name))
    .map((entry) => join(engineeringOSRoot, entry.name));
  const docs = docRoots.flatMap((docRoot) => listFilesRecursive(docRoot, [".md"]));

  return docs.map((filePath) => {
    const content = safeReadText(filePath) ?? "";
    return {
      path: toRepoRelative(filePath, repoRoot),
      title: getTitle(content, toRepoRelative(filePath, repoRoot)),
      bytes: content.length,
      content,
    };
  });
}

function listEcpFiles(repoRoot: string): string[] {
  const ecpRoot = join(repoRoot, "ecp");

  if (!existsSync(ecpRoot)) {
    return [];
  }

  return readdirSync(ecpRoot)
    .filter((fileName) => /^ECP-\d{4}\.json$/.test(fileName))
    .sort()
    .map((fileName) => join(ecpRoot, fileName));
}

export function loadEngineeringContext(repoRoot = findRepoRoot()): EngineeringContextPackage {
  const ecpFiles = listEcpFiles(repoRoot);
  const latestRecordPath = ecpFiles.length ? ecpFiles[ecpFiles.length - 1] : null;
  const timelinePath = join(repoRoot, "ecp", "timeline.json");
  const timelineEvents = readJsonFile<unknown[]>(timelinePath) ?? [];

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    structure: {
      requiredRootFolders: ["app", "components", "lib", "hooks", "supabase", "ecp", "engineeringos"].map(
        (folder) => ({
          path: folder,
          exists: existsSync(join(repoRoot, folder)),
        })
      ),
      importantFiles: [
        "AGENTS.md",
        "ENGINEERINGOS.ID",
        "ENGINEERINGOS.json",
        "AI_CAPABILITY_MATRIX.md",
        "ENGINEERING_CONSTITUTION.md",
        "package.json",
      ].map((fileName) => getFileInfo(join(repoRoot, fileName), repoRoot)),
    },
    docs: loadEngineeringDocs(repoRoot),
    ecp: {
      timelineExists: existsSync(timelinePath),
      timelineEvents,
      latestRecord: latestRecordPath ? readJsonFile<unknown>(latestRecordPath) : null,
      latestRecordPath: latestRecordPath ? toRepoRelative(latestRecordPath, repoRoot) : null,
      files: ecpFiles.map((filePath) => toRepoRelative(filePath, repoRoot)),
    },
  };
}

if (isMainModule(import.meta.url)) {
  const context = loadEngineeringContext();
  writeJsonFile("engineeringos/reports/context-package.json", context);
  console.log(JSON.stringify(context, null, 2));
}
