import { existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import {
  REQUIRED_KERNEL_FILES,
  REQUIRED_PACKAGE_SCRIPTS,
  findRepoRoot,
  getKernelRoot,
  getPackageScripts,
  isMainModule,
  listFilesRecursive,
  readJsonFile,
  safeReadText,
  toRepoRelative,
  writeJsonFile,
} from "./config";
import type { EngineeringOSStatus, ValidationCheck } from "./types";

export interface ValidationResult {
  generatedAt: string;
  status: EngineeringOSStatus;
  checks: ValidationCheck[];
  missingItems: string[];
}

function check(name: string, status: EngineeringOSStatus, detail: string): ValidationCheck {
  return { name, status, detail };
}

function parseTypeScriptFiles(repoRoot: string): ValidationCheck {
  const kernelRoot = getKernelRoot(repoRoot);
  const files = listFilesRecursive(kernelRoot, [".ts", ".tsx"]);
  const failures: string[] = [];

  for (const filePath of files) {
    const raw = safeReadText(filePath) ?? "";
    const source = ts.createSourceFile(
      filePath,
      raw,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const diagnostics =
      (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];

    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
      failures.push(`${toRepoRelative(filePath, repoRoot)}: ${message}`);
    }
  }

  if (failures.length) {
    return check("typescriptParse", "FAIL", failures.slice(0, 5).join("; "));
  }

  return check("typescriptParse", "PASS", `${files.length} kernel TypeScript files parsed.`);
}

function validateRequiredScripts(repoRoot: string): ValidationCheck {
  const scripts = getPackageScripts(repoRoot);
  const missing = REQUIRED_PACKAGE_SCRIPTS.filter((scriptName) => !scripts[scriptName]);

  if (missing.length) {
    return check("packageScripts", "PARTIAL", `Missing scripts: ${missing.join(", ")}`);
  }

  return check("packageScripts", "PASS", "Required npm scripts are present.");
}

export function runValidation(repoRoot = findRepoRoot()): ValidationResult {
  const checks: ValidationCheck[] = [];
  const packagePath = join(repoRoot, "package.json");
  const engineeringOSRoot = join(repoRoot, "engineeringos");
  const ecpTimelinePath = join(repoRoot, "ecp", "timeline.json");
  const kernelRoot = getKernelRoot(repoRoot);

  checks.push(check("repoRoot", existsSync(repoRoot) ? "PASS" : "FAIL", repoRoot));
  checks.push(check("packageJson", existsSync(packagePath) ? "PASS" : "FAIL", "package.json must exist."));
  checks.push(check("engineeringOSRoot", existsSync(engineeringOSRoot) ? "PASS" : "FAIL", "engineeringos must exist."));
  checks.push(
    check(
      "ecpTimeline",
      existsSync(ecpTimelinePath) ? "PASS" : "PARTIAL",
      existsSync(ecpTimelinePath) ? "ecp/timeline.json exists." : "ecp/timeline.json is missing."
    )
  );

  const missingKernelFiles = REQUIRED_KERNEL_FILES.filter((fileName) => !existsSync(join(kernelRoot, fileName)));
  checks.push(
    check(
      "kernelFiles",
      missingKernelFiles.length ? "FAIL" : "PASS",
      missingKernelFiles.length
        ? `Missing kernel files: ${missingKernelFiles.join(", ")}`
        : "Required kernel files exist."
    )
  );

  checks.push(parseTypeScriptFiles(repoRoot));
  checks.push(validateRequiredScripts(repoRoot));

  const packageJson = readJsonFile<unknown>(packagePath);
  checks.push(check("packageJsonParse", packageJson ? "PASS" : "FAIL", "package.json parses as JSON."));

  const missingItems = checks
    .filter((item) => item.status !== "PASS")
    .map((item) => `${item.name}: ${item.detail}`);

  const hasFail = checks.some((item) => item.status === "FAIL");
  const hasPartial = checks.some((item) => item.status === "PARTIAL");

  const result: ValidationResult = {
    generatedAt: new Date().toISOString(),
    status: hasFail ? "FAIL" : hasPartial ? "PARTIAL" : "PASS",
    checks,
    missingItems,
  };

  writeJsonFile(join(repoRoot, "engineeringos", "reports", "validation-result.json"), result);
  return result;
}

if (isMainModule(import.meta.url)) {
  const result = runValidation();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "FAIL" ? 1 : 0;
}
