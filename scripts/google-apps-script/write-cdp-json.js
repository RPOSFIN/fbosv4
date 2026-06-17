const fs = require("fs");
const path = require("path");
const dir = __dirname;
const chunks = [0, 1, 2].map((i) =>
  fs.readFileSync(path.join(dir, `pushchunk${i}.js`), "utf8").trim()
);
const final = fs.readFileSync(path.join(dir, "push-final.js"), "utf8").trim();
for (let i = 0; i < chunks.length; i++) {
  fs.writeFileSync(
    path.join(dir, `cdp-chunk${i}.json`),
    JSON.stringify({ method: "Runtime.evaluate", params: { expression: chunks[i], returnByValue: true } })
  );
}
fs.writeFileSync(
  path.join(dir, "cdp-final.json"),
  JSON.stringify({ method: "Runtime.evaluate", params: { expression: final, returnByValue: true } })
);
console.log("ok");
