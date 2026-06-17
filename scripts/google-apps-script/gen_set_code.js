const fs = require("fs");
const path = require("path");
const dir = __dirname;
const parts = [];
for (let i = 0; i < 10; i++) {
  parts.push(fs.readFileSync(path.join(dir, "c" + i + ".txt"), "utf8"));
}
const code = parts.join("");
const expr =
  "(()=>{const code=" +
  JSON.stringify(code) +
  '; monaco.editor.getModels()[0].setValue(code); return {len:code.length, hasSetup:code.includes("setupSingleSheetFinance")};})()';
fs.writeFileSync(path.join(dir, "set_code_expr.js"), expr);
console.log("expr bytes:", expr.length, "code bytes:", code.length);
