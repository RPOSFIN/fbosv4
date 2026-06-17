const fs = require("fs");
const path = require("path");
const dir = __dirname;
const block = fs.readFileSync(path.join(dir, "finance_block.txt"), "utf8");
for (let i = 0; i < 4; i++) {
  const chunk = block.slice(i * 3000, (i + 1) * 3000);
  const expr =
    "(()=>{window.__fb=(window.__fb||'')+" +
    JSON.stringify(chunk) +
    "; return window.__fb.length;})()";
  fs.writeFileSync(path.join(dir, "fb_inj" + i + ".js"), expr);
  console.log("fb_inj" + i + ".js", expr.length);
}
const splice =
  '(()=>{let v=monaco.editor.getModels()[0].getValue(); v=v.replace(/function setupSingleSheetFinance\\(\\) \\{ return \\{ok:true\\}; \\}/, window.__fb); if(!v.includes("hideLegacyFinanceTabs")){ const m="/** Unified Order Master"; v=v.includes(m)?v.replace(m, window.__fb+"\\n\\n"+m):v+"\\n\\n"+window.__fb;} monaco.editor.getModels()[0].setValue(v); return {len:v.length, hasHide:v.includes("hideLegacyFinanceTabs"), hasSetup:v.includes("setupSingleSheetFinance")};})()';
fs.writeFileSync(path.join(dir, "fb_apply.js"), splice);
console.log("fb_apply.js", splice.length);
