const fs = require("fs");
const code = fs.readFileSync(__dirname + "/Code.gs", "utf8");
const cs = 6000;
const parts = [];
for (let i = 0; i < code.length; i += cs) {
  parts.push(Buffer.from(code.slice(i, i + cs)).toString("base64"));
}
const scripts = parts.map(
  (b, i) =>
    `(()=>{window.__codeParts=window.__codeParts||[];window.__codeParts[${i}]=atob(${JSON.stringify(b)});return ${i};})()`
);
const final =
  "(()=>{const code=(window.__codeParts||[]).join('');monaco.editor.getModels()[0].setValue(code);return {len:code.length,hasSetup:code.includes('setupSingleSheetFinance')};})()";
fs.writeFileSync(
  __dirname + "/cdp_b64.json",
  JSON.stringify({ count: parts.length, scripts, final })
);
scripts.forEach((s, i) => console.log(i, s.length));
