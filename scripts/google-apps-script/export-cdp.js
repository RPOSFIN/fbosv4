const fs = require("fs");
const path = require("path");
const dir = __dirname;
const chunks = [0, 1, 2].map((i) => fs.readFileSync(path.join(dir, `pushchunk${i}.js`), "utf8").trim());
const final = fs.readFileSync(path.join(dir, "push-final.js"), "utf8").trim();
const out = { chunks, final };
fs.writeFileSync(path.join(dir, "cdp-expressions.json"), JSON.stringify(out));
console.log("written", out.chunks.map((c) => c.length), out.final.length);
