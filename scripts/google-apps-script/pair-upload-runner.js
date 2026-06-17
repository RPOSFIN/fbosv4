/**
 * Upload Code.gs via pair CDP chunks to Apps Script editor.
 * Usage: node pair-upload-runner.js [cdpUrl]
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
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          id: 1,
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

  await cdpEval(
    page.webSocketDebuggerUrl,
    '(() => { window.__fbosParts = []; return "init"; })()'
  );

  const chunks = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("_pair_cdp_") && f.endsWith(".txt") && f !== "_pair_cdp_fin.txt")
    .sort((a, b) => {
      const na = parseInt(a.match(/_pair_cdp_(\d+)/)[1], 10);
      const nb = parseInt(b.match(/_pair_cdp_(\d+)/)[1], 10);
      return na - nb;
    });

  for (const f of chunks) {
    const expr = fs.readFileSync(path.join(dir, f), "utf8");
    const res = await cdpEval(page.webSocketDebuggerUrl, expr);
    console.log(f, res.result?.value ?? res.result);
  }

  const fin = fs.readFileSync(path.join(dir, "_pair_cdp_fin.txt"), "utf8");
  const finExpr =
    fin.slice(0, -4) +
    ', hasNormalize: v.includes("normalizeDashLabel") }; })()';
  const res = await cdpEval(page.webSocketDebuggerUrl, finExpr);
  console.log("final", JSON.stringify(res.result?.value ?? res.result));
}

main().catch((e) => {
  console.error("Pair upload failed:", e.message);
  process.exit(1);
});
