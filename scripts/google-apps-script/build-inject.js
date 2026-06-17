const fs = require("fs");
const path = require("path");
const dir = __dirname;
const code = fs.readFileSync(path.join(dir, "Code.gs"), "utf8");
const lines = code.split(/\r?\n/);
const p1 = lines.slice(0, 400).join("\n");
const p2 = lines.slice(400).join("\n");
const e1 = "window.__fbos=" + JSON.stringify(p1) + "; 'part1'";
const e2 =
  "(()=>{const ed=monaco.editor.getEditors()[0]; const code=window.__fbos+" +
  JSON.stringify(p2) +
  "; ed.setValue(code); ed.pushUndoStop(); return JSON.stringify({len:code.length, hasSetup:code.includes('setupUnifiedOrderMaster'), tail:code.slice(-120)});})()";
fs.writeFileSync(path.join(dir, "inject-part1.txt"), e1);
fs.writeFileSync(path.join(dir, "inject-part2.txt"), e2);
console.log("part1", e1.length, "part2", e2.length, "hasSetup", code.includes("setupUnifiedOrderMaster"));
