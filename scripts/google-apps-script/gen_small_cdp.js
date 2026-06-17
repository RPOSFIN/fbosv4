const fs = require("fs");
const path = require("path");
const content = fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8");
const chunkSize = 1500;
const chunks = [];
for (let i = 0; i < content.length; i += chunkSize) {
  chunks.push(content.slice(i, i + chunkSize));
}
chunks.forEach((c, i) => {
  const expr =
    "(() => { window.__fbosParts = window.__fbosParts || []; window.__fbosParts.push(" +
    JSON.stringify(c) +
    "); return " +
    i +
    "; })()";
  fs.writeFileSync(path.join(__dirname, "_small_cdp_" + i + ".txt"), expr);
  console.log(i, expr.length);
});
const fin2 =
  '(() => { const ed = monaco.editor.getEditors()[0]; const v = window.__fbosParts.join(""); ed.setValue(v); return { len: v.length, hasSetup: v.includes("setupFinanceDashboardFormulas"), hasMissedJoin: v.includes("missed.join"), hasClickUp: v.includes("setupClickUpLeadPipeline"), hasAliases: v.includes("FINANCE_LABEL_ALIASES") }; })()';
fs.writeFileSync(path.join(__dirname, "_small_cdp_fin.txt"), fin2);
console.log("chunks", chunks.length, "fin", fin2.length);
