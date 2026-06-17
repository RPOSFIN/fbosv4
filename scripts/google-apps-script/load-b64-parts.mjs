import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const parts = [0, 1, 2, 3].map((i) => readFileSync(join(dir, `b64-part-${i}.txt`), "utf8").trim());
// Output as JSON array for agent MCP CDP calls
process.stdout.write(JSON.stringify(parts));
