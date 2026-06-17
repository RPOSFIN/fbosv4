/**
 * Upload Code.gs chunks to Apps Script editor via Chrome CDP.
 * Usage: node cdp-upload-runner.js [cdpUrl]
 * Default cdpUrl: http://127.0.0.1:9222
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const dir = __dirname;
const cdpBase = process.argv[2] || "http://127.0.0.1:9222";

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(data.slice(0, 200)));
        }
      });
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function cdpEval(wsUrl, expression) {
  const WebSocket = require("ws");
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 1;
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          id: id++,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === 1) {
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.on("error", reject);
  });
}

async function main() {
  const list = await fetchJson(`${cdpBase}/json/list`);
  const page =
    list.find((t) => t.url && t.url.includes("script.google.com/home/projects")) ||
    list.find((t) => t.type === "page");
  if (!page) throw new Error("Apps Script editor tab not found in CDP");
  console.log("target", page.title);

  await cdpEval(page.webSocketDebuggerUrl, "window.__codeParts=[]; 0");

  const chunks = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("_run_chunk_") && f.endsWith(".txt"))
    .sort();
  for (const f of chunks) {
    const expr = fs.readFileSync(path.join(dir, f), "utf8");
    const res = await cdpEval(page.webSocketDebuggerUrl, expr);
    console.log(f, res.result?.value ?? res.result);
  }

  const final = fs.readFileSync(path.join(dir, "_run_final.txt"), "utf8");
  const finalExpr = final.replace(
    "setupSingleSheetFinance",
    "setupAllFbosHub"
  );
  const res = await cdpEval(page.webSocketDebuggerUrl, finalExpr);
  console.log("final", res.result?.value ?? res.result);
}

main().catch((e) => {
  console.error("CDP upload failed:", e.message);
  process.exit(1);
});
