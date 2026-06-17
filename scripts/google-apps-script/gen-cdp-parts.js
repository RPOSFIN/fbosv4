const fs = require("fs");
const lines = fs.readFileSync("Code.gs", "utf8").split(/\r?\n/);
const p1 = lines.slice(0, 180).join("\n");
const p2 = lines.slice(180).join("\n");
const e1 = "window.__fbos=" + JSON.stringify(p1) + "; 'part1'";
const e2 =
  "(()=>{const ed=monaco.editor.getEditors()[0]; const code=window.__fbos+" +
  JSON.stringify(p2) +
  "; ed.setValue(code); ed.pushUndoStop(); return code.includes('FBOS Finance Hub');})()";
fs.writeFileSync("cdp-part1.txt", e1);
fs.writeFileSync("cdp-part2.txt", e2);
console.log(e1.length, e2.length);
