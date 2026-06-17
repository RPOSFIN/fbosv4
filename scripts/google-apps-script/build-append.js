const fs = require("fs");
const path = require("path");
const dir = __dirname;
const code = fs.readFileSync(path.join(dir, "Code.gs"), "utf8");
const lines = code.split(/\r?\n/);
const missing = lines.slice(286).join("\n");
const mid = Math.floor(missing.length / 2);
const m1 = missing.slice(0, mid);
const m2 = missing.slice(mid);
const mk = (part, idx) =>
  "(() => { const ed = monaco.editor.getEditors()[0]; const extra = " +
  JSON.stringify(part) +
  "; ed.setValue(ed.getValue() + extra); ed.pushUndoStop(); return ed.getValue().length; })()";
fs.writeFileSync(path.join(dir, "append1.js"), mk(m1, 1));
fs.writeFileSync(path.join(dir, "append2.js"), mk(m2, 2));
const verify =
  "(() => { const v = monaco.editor.getEditors()[0].getValue(); return JSON.stringify({ len: v.length, hasSetup: v.includes('setupUnifiedOrderMaster'), hasFinance: v.includes('setupSingleSheetFinance') }); })()";
fs.writeFileSync(path.join(dir, "append-verify.js"), verify);
console.log("missing", missing.length, "p1", m1.length, "p2", m2.length);
