import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, "Code.gs"), "utf8");
const b64 = Buffer.from(code, "utf8").toString("base64");
const expr = `(()=>{const c=atob(${JSON.stringify(b64)});monaco.editor.getModels()[0].setValue(c);return {len:c.length,hasResume:c.includes('resumeFbosSetup'),hasDoGet:c.includes('action === \\"resume\\"')};})()`;
writeFileSync(join(dir, "single-inject-expr.txt"), expr, "utf8");
console.log(JSON.stringify({ codeLen: code.length, b64Len: b64.length, exprLen: expr.length }));
