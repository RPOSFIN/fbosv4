import fs from "fs";
import path from "path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

/** Upsert keys in .env.local (dev/server only) */
export function upsertEnvLocal(vars: Record<string, string>): void {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";

  for (const [key, value] of Object.entries(vars)) {
    const escaped = value.replace(/\n/g, "");
    const line = `${key}=${escaped}`;
    const regex = new RegExp(`^#?\\s*${key}=.*$`, "m");

    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      if (content.length && !content.endsWith("\n")) content += "\n";
      content += `${line}\n`;
    }
  }

  fs.writeFileSync(ENV_FILE, content, "utf8");
}

export function readEnvLocalValue(key: string): string | undefined {
  if (!fs.existsSync(ENV_FILE)) return undefined;
  const content = fs.readFileSync(ENV_FILE, "utf8");
  const match = content.match(new RegExp(`^#?\\s*${key}=(.+)$`, "m"));
  return match?.[1]?.trim();
}
