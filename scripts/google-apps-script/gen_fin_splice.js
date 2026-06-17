const fs = require("fs");
const path = require("path");
const dir = __dirname;
const block = fs.readFileSync(path.join(dir, "finance_block.txt"), "utf8");
const expr =
  "(()=>{const block=" +
  JSON.stringify(block) +
  '; let v=monaco.editor.getModels()[0].getValue(); if(v.includes("setupSingleSheetFinance")) return {already:true}; const m="/** Unified Order Master"; v=v.includes(m)?v.replace(m, block+"\\n\\n"+m):v+"\\n\\n"+block; monaco.editor.getModels()[0].setValue(v); return {len:v.length, hasSetup:v.includes("setupSingleSheetFinance")};})()';
fs.writeFileSync(path.join(dir, "fin_splice.js"), expr);
console.log("expr bytes:", expr.length);
