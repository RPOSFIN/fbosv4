import { join } from "node:path";
import {
  findRepoRoot,
  isMainModule,
  safeReadText,
  writeJsonFile,
} from "./config";

export type SupabaseIntegrationState = "CONFIGURED" | "PARTIAL" | "NOT_CONFIGURED";

export interface EnvPresence {
  name: string;
  present: boolean;
  sources: string[];
}

export interface SupabaseIntegrationStatus {
  generatedAt: string;
  state: SupabaseIntegrationState;
  credentialsRequired: false;
  liveConnectionAttempted: false;
  migrationsAttempted: false;
  variables: EnvPresence[];
  message: string;
}

export interface SupabaseHandoffStub {
  generatedAt: string;
  action: "NO_OP";
  state: SupabaseIntegrationState;
  message: string;
}

const SUPABASE_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
] as const;

function readEnvKeysFromFile(filePath: string): Set<string> {
  const raw = safeReadText(filePath);
  const keys = new Set<string>();

  if (!raw) {
    return keys;
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }

  return keys;
}

export function getSupabaseIntegrationStatus(repoRoot = findRepoRoot()): SupabaseIntegrationStatus {
  const fileKeySources = new Map<string, string[]>();

  for (const envFile of ENV_FILES) {
    const filePath = join(repoRoot, envFile);
    const keys = readEnvKeysFromFile(filePath);

    for (const key of keys) {
      const sources = fileKeySources.get(key) ?? [];
      sources.push(envFile);
      fileKeySources.set(key, sources);
    }
  }

  const variables = SUPABASE_ENV_NAMES.map((name) => {
    const sources = [...(fileKeySources.get(name) ?? [])];

    if (process.env[name]) {
      sources.push("process.env");
    }

    return {
      name,
      present: sources.length > 0,
      sources,
    };
  });

  const hasUrl = variables.some(
    (item) => item.present && (item.name === "NEXT_PUBLIC_SUPABASE_URL" || item.name === "SUPABASE_URL")
  );
  const hasPublicKey = variables.some(
    (item) =>
      item.present &&
      (item.name === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
        item.name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ||
        item.name === "SUPABASE_ANON_KEY")
  );
  const anyPresent = variables.some((item) => item.present);

  const state: SupabaseIntegrationState = hasUrl && hasPublicKey
    ? "CONFIGURED"
    : anyPresent
      ? "PARTIAL"
      : "NOT_CONFIGURED";

  return {
    generatedAt: new Date().toISOString(),
    state,
    credentialsRequired: false,
    liveConnectionAttempted: false,
    migrationsAttempted: false,
    variables,
    message:
      state === "CONFIGURED"
        ? "Supabase environment keys are present. No live connection was attempted."
        : state === "PARTIAL"
          ? "Some Supabase environment keys are present, but the URL/public key pair is incomplete."
          : "Supabase environment keys are not configured. This is safe for the offline stub.",
  };
}

export function syncHandoffStub(repoRoot = findRepoRoot()): SupabaseHandoffStub {
  const status = getSupabaseIntegrationStatus(repoRoot);
  const stub: SupabaseHandoffStub = {
    generatedAt: new Date().toISOString(),
    action: "NO_OP",
    state: status.state,
    message: "Supabase handoff sync stub completed without credentials, migrations, or database writes.",
  };

  writeJsonFile(join(repoRoot, "engineeringos", "reports", "supabase-integration-status.json"), {
    status,
    stub,
  });

  return stub;
}

if (isMainModule(import.meta.url)) {
  const status = getSupabaseIntegrationStatus();
  syncHandoffStub();
  console.log(JSON.stringify(status, null, 2));
}
