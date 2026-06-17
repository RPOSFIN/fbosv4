const fs = require("fs");
const path = require("path");
const b64 = fs.readFileSync(path.join(__dirname, "_upload_b64.txt"), "utf8");
const n = 8;
const sz = Math.ceil(b64.length / n);
for (let i = 0; i < n; i++) {
  const p = b64.slice(i * sz, (i + 1) * sz);
  const expr =
    '(() => { window.__b64 = window.__b64 || ""; window.__b64 += "' +
    p +
    '"; return ' +
    i +
    "; })()";
  fs.writeFileSync(path.join(__dirname, "_b64_cdp_" + i + ".txt"), expr);
  console.log(i, expr.length);
}
const fin =
  '(() => { const t = atob(window.__b64); const ed = monaco.editor.getEditors()[0]; ed.setValue(t); ed.pushUndoStop(); return { len: t.length, hasResume: t.includes("resumeFbosSetup"), hasNormalize: t.includes("normalizeDashLabel") }; })()';
fs.writeFileSync(path.join(__dirname, "_b64_cdp_fin.txt"), fin);
console.log("fin", fin.length);
