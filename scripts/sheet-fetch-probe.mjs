import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const sheetId = process.env.GOOGLE_SHEET_ID;
const secret = process.env.SHEET_SYNC_SECRET;
const webapp = process.env.GOOGLE_WEBAPP_URL;

async function tryUrl(label, url) {
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  const text = await res.text();
  const login = text.includes("accounts.google.com/ServiceLogin");
  console.log(label, "status", res.status, "login?", login, "len", text.length, "preview", text.slice(0, 80).replace(/\n/g, " "));
}

await tryUrl("gviz finance", `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=1663252170`);
await tryUrl("gviz ops", `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=443214491`);
await tryUrl("export finance", `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1663252170`);

const syncUrl = `${webapp}?action=sync_supabase&secret=${encodeURIComponent(secret)}`;
const res = await fetch(syncUrl, { redirect: "follow" });
console.log("webapp sync_supabase", res.status, (await res.text()).slice(0, 500));
