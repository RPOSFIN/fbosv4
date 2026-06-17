const fs = require("fs");
const path = require("path");
const dir = __dirname;
const code = fs.readFileSync(path.join(dir, "Code.gs"), "utf8");
const b64 = Buffer.from(code).toString("base64");
const expr =
  "(()=>{const code=atob(" +
  JSON.stringify(b64) +
  ');monaco.editor.getModels()[0].setValue(code);return {len:code.length,hasSetupAll:code.includes("setupAllFbosHub"),hasSync:code.includes("syncClickUpToLeadCrm")};})()';
fs.writeFileSync(path.join(dir, "_single_upload.txt"), expr);
console.log("expr len", expr.length);
