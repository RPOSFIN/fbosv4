import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const chunks = [];
for (let i = 0; i < 6; i++) {
  chunks.push(readFileSync(join(dir, `_mcp_chunk_${i}.txt`), "utf8"));
}
const final = readFileSync(join(dir, "_mcp_final.txt"), "utf8");

// Print manifest for agent to run via browser_cdp
console.log(JSON.stringify({
  init: 'window.__codeParts=[]; "init"',
  chunks: chunks.map((e, i) => ({ i, len: e.length })),
  finalLen: final.length,
}));
