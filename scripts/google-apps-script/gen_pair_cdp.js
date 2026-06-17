const fs = require("fs");
const path = require("path");
const content = fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8");
const chunkSize = 1500;
const chunks = [];
for (let i = 0; i < content.length; i += chunkSize) {
  chunks.push(content.slice(i, i + chunkSize));
}
const pairSize = 2;
let fileIdx = 0;
for (let i = 0; i < chunks.length; i += pairSize) {
  const pair = chunks.slice(i, i + pairSize);
  const pushes = pair
    .map((c) => "window.__fbosParts.push(" + JSON.stringify(c) + ");")
    .join("");
  const expr =
    "(() => { window.__fbosParts = window.__fbosParts || []; " +
    pushes +
    " return " +
    fileIdx +
    "; })()";
  fs.writeFileSync(path.join(__dirname, "_pair_cdp_" + fileIdx + ".txt"), expr);
  console.log(fileIdx, expr.length);
  fileIdx++;
}
const fin =
  '(() => { const ed = monaco.editor.getEditors()[0]; const v = window.__fbosParts.join(""); ed.setValue(v); return { len: v.length, hasSetup: v.includes("setupFinanceDashboardFormulas"), hasMissedJoin: v.includes("missed.join"), hasClickUp: v.includes("setupClickUpLeadPipeline"), hasAliases: v.includes("FINANCE_LABEL_ALIASES") }; })()';
fs.writeFileSync(path.join(__dirname, "_pair_cdp_fin.txt"), fin);
console.log("pairs", fileIdx, "fin", fin.length);
