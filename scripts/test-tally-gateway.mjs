const hosts = ["wsipl-89-72"];
const ports = ["9007", "10021"];
const company = "Flexiflair Tech Pvt Ltd";

const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

for (const host of hosts) {
  for (const port of ports) {
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
