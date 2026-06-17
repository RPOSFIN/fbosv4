import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, "Code.gs"), "utf8");
const b64 = Buffer.from(code, "utf8").toString("base64");
const partSize = 20000;
const parts = [];
for (let i = 0; i < b64.length; i += partSize) {
  parts.push(b64.slice(i, i + partSize));
}
const exprs = parts.map((p, i) => {
  if (i === 0) {
    return `window.__b64=${JSON.stringify(p)}; (${i})`;
  }
  return `window.__b64+=${JSON.stringify(p)}; (${i})`;
});
exprs.push(
  `(()=>{const c=atob(window.__b64);monaco.editor.getModels()[0].setValue(c);return {len:c.length,hasResume:c.includes('resumeFbosSetup')};})()`
);
writeFileSync(join(dir, "b64-inject-exprs.json"), JSON.stringify({ parts: parts.length, exprs }, null, 0));
console.log("parts", parts.length, "lens", parts.map((p) => p.length));
