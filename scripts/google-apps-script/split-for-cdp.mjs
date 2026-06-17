#!/usr/bin/env node
/** Split Code.gs into CDP-safe chunks for Apps Script editor injection */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "Code.gs"), "utf8");
const chunkSize = 12000;
const chunks = [];
for (let i = 0; i < src.length; i += chunkSize) {
  chunks.push(src.slice(i, i + chunkSize));
}
const outDir = join(__dirname, "cdp-chunks");
mkdirSync(outDir, { recursive: true });
chunks.forEach((c, i) => {
  const expr = `(()=>{window.__fbos=window.__fbos||"";window.__fbos+=${JSON.stringify(c)};return ${i + 1};})()`;
  writeFileSync(join(outDir, `chunk-${i}.json`), JSON.stringify({ expression: expr }));
});
const finalize = `(()=>{const ed=monaco.editor.getEditors()[0];if(!ed)return "no editor";ed.setValue(window.__fbos||"");return ed.getValue().length;})()`;
writeFileSync(join(outDir, "finalize.json"), JSON.stringify({ expression: finalize }));
const init = `(()=>{window.__fbos="";return 0;})()`;
writeFileSync(join(outDir, "init.json"), JSON.stringify({ expression: init }));
console.log("chunks:", chunks.length, "bytes:", src.length);
