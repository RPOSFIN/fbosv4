/**
 * Prints pair/b64 CDP expressions one per line with markers for batch processing.
 * node mcp-batch-upload.js b64|pair
 */
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const mode = process.argv[2] || "b64";

const init =
  mode === "b64"
    ? '(() => { window.__b64 = ""; return "init"; })()'
    : '(() => { window.__fbosParts = []; return "init"; })()';

const files =
  mode === "b64"
    ? fs
        .readdirSync(dir)
        .filter((f) => /^_b64_cdp_\d+\.txt$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
    : fs
        .readdirSync(dir)
        .filter((f) => /^_pair_cdp_\d+\.txt$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const finFile = mode === "b64" ? "_b64_cdp_fin.txt" : "_pair_cdp_fin.txt";
let fin = fs.readFileSync(path.join(dir, finFile), "utf8");
if (mode === "b64") {
  fin =
    fin.slice(0, -4) +
    ', hasNormalize: t.includes("normalizeDashLabel") }; })()';
}

const out = [init];
files.forEach((f) => out.push(fs.readFileSync(path.join(dir, f), "utf8")));
out.push(fin);

const manifest = path.join(dir, "_upload_manifest.json");
fs.writeFileSync(
  manifest,
  JSON.stringify({ mode, count: out.length, lengths: out.map((e) => e.length) })
);
console.log(JSON.stringify({ mode, count: out.length, lengths: out.map((e) => e.length) }));
