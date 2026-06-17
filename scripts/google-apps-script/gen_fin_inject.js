const fs = require("fs");
const fb = fs.readFileSync(__dirname + "/finance_block.txt", "utf8");
const b64 = Buffer.from(fb).toString("base64");
const mid = Math.ceil(b64.length / 2);
const parts = [b64.slice(0, mid), b64.slice(mid)];
const loadScripts = parts.map(
  (p, i) =>
    `(()=>{window.__fbB64=window.__fbB64||[];window.__fbB64[${i}]=${JSON.stringify(p)};return ${i};})()`
);
const applyScript = `(()=>{const fb=atob((window.__fbB64||[]).join('')); let v=monaco.editor.getModels()[0].getValue(); v=v.replace(/function setupSingleSheetFinance\\(\\) \\{ return \\{ok:true[^}]*\\}; \\}/, fb); if(!v.includes('hideLegacyFinanceTabs')){ const m="/** Unified Order Master"; v=v.includes(m)?v.replace(m, fb+"\\n\\n"+m):v+"\\n\\n"+fb;} monaco.editor.getModels()[0].setValue(v); return {len:v.length, hasHide:v.includes('hideLegacyFinanceTabs'), hasSetup:v.includes('setupSingleSheetFinance'), stub:v.includes('note:\\'stub\\'')};})()`;
fs.writeFileSync(
  __dirname + "/fin_inject.json",
  JSON.stringify({ loadScripts, applyScript })
);
console.log("b64", b64.length, "parts", parts.map((p) => p.length));
