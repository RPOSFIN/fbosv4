const fs = require("fs");
const path = require("path");
const dir = __dirname;
const code = fs.readFileSync(path.join(dir, "Code.gs"), "utf8");
const b64 = Buffer.from(code, "utf8").toString("base64");
const chunkSize = 12000;
const chunks = [];
for (let i = 0; i < b64.length; i += chunkSize) {
  chunks.push(b64.slice(i, i + chunkSize));
}
chunks.forEach((c, i) => {
  fs.writeFileSync(path.join(dir, `b64chunk${i}.txt`), c);
  const js = `(() => { window.__b64 = (window.__b64 || '') + ${JSON.stringify(c)}; return window.__b64.length; })()`;
  fs.writeFileSync(path.join(dir, `pushchunk${i}.js`), js);
});
const final =
  "(() => { const ed = monaco.editor.getEditors()[0]; const code = atob(window.__b64 || ''); ed.setValue(code); ed.pushUndoStop(); return JSON.stringify({ len: code.length, hasSetup: code.includes('setupUnifiedOrderMaster') }); })()";
fs.writeFileSync(path.join(dir, "push-final.js"), final);
console.log("chunks", chunks.length, "b64len", b64.length);
