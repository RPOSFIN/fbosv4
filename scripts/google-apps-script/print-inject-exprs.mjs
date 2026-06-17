import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.startsWith("inject-expr-") && f.endsWith(".txt"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

for (const f of files) {
  const expr = readFileSync(join(dir, f), "utf8").trim();
  console.log("FILE:" + f + " LEN:" + expr.length);
  console.log(expr);
  console.log("---END---");
}
