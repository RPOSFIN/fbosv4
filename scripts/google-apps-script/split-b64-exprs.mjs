import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const { exprs } = JSON.parse(readFileSync(join(dir, "b64-inject-exprs.json"), "utf8"));
exprs.forEach((e, i) => writeFileSync(join(dir, `b64-part-${i}.txt`), e, "utf8"));
console.log("wrote", exprs.length, "files");
