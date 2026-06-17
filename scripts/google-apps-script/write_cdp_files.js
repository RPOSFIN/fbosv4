const fs = require("fs");
const j = JSON.parse(fs.readFileSync("cdp_chunks.json", "utf8"));
fs.writeFileSync(
  "cdp-init.txt",
  '(() => { window.__codeParts = []; return "init"; })()'
);
j.scripts.forEach((s, i) => fs.writeFileSync("cdp-chunk-" + i + ".txt", s));
fs.writeFileSync(
  "cdp-final.txt",
  "(()=>{const ed=monaco.editor.getModels()[0];const code=(window.__codeParts||[]).join('');ed.setValue(code);ed.pushUndoStop();return {len:code.length,hasSales:code.includes('setupSalesDashboardFormulas'),hasPendingFix:code.includes('IFERROR(ROWS(FILTER'),hasOrderFix:code.includes('IFERROR((')};})()"
);
console.log("done", j.scripts.length, "total", j.total);
