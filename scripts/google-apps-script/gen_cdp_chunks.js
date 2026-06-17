const fs = require("fs");
const code = fs.readFileSync(__dirname + "/Code.gs", "utf8");
const chunkSize = 8000;
const chunks = [];
for (let i = 0; i < code.length; i += chunkSize) {
  chunks.push(code.slice(i, i + chunkSize));
}
const scripts = chunks.map(
  (c, i) =>
    `(()=>{window.__codeParts=window.__codeParts||[];window.__codeParts[${i}]=${JSON.stringify(c)};return ${i};})()`
);
const final =
  "(()=>{const code=(window.__codeParts||[]).join('');monaco.editor.getModels()[0].setValue(code);return {len:code.length,hasSetup:code.includes('setupSingleSheetFinance')};})()";
fs.writeFileSync(__dirname + "/cdp_chunks.json", JSON.stringify({ count: chunks.length, total: code.length, scripts, final }));
console.log("chunks", chunks.length, "total", code.length);
