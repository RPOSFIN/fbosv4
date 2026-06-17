const http = require("http");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8");
const envPath = path.join(__dirname, "..", "..", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i)] = t.slice(i + 1);
}

const props = {
  SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || "",
  SPREADSHEET_ID: env.GOOGLE_SHEET_ID || "",
  SHEET_SYNC_SECRET: env.SHEET_SYNC_SECRET || "",
  SYNC_SECRET: env.SHEET_SYNC_SECRET || "",
  CLICKUP_API_TOKEN: env.CLICKUP_API_TOKEN || "",
  CLICKUP_LIST_ID: env.CLICKUP_LIST_ID || "",
  GOOGLE_WEBAPP_URL: env.GOOGLE_WEBAPP_URL || "",
};

http
  .createServer((req, res) => {
    const headers = { "Access-Control-Allow-Origin": "*" };
    if (req.url === "/props.json") {
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify(props));
      return;
    }
    res.writeHead(200, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    res.end(req.url === "/Code.gs" || req.url === "/" ? code : "not found");
  })
  .listen(8767, "127.0.0.1", () => console.log("FBOS local on :8767"));
