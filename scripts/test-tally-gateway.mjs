#!/usr/bin/env node
/** Test Tally XML gateway — run ON cloud server (127.0.0.1) or from dev PC (hostname/IP) */
const hosts = [
  process.env.TALLY_HOST,
  "127.0.0.1",
  "wsipl-89-72",
  "WSIPL-89-72",
].filter(Boolean);
const ports = [
  process.env.TALLY_PORT || "9007",
  "9007",
  "10021",
];
const company =
  process.env.TALLY_COMPANY_NAME || "Flexiflair Tech Private Limited";

const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

const seen = new Set();
for (const host of hosts) {
  for (const port of ports) {
    const key = `${host}:${port}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = `http://${host}:${port}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: xml,
        signal: AbortSignal.timeout(12000),
      });
      const body = (await res.text()).slice(0, 150);
      console.log(`${url} → ${res.status} ${body.replace(/\n/g, " ")}`);
    } catch (e) {
      console.log(`${url} → ERR ${e.message}`);
    }
  }
}
