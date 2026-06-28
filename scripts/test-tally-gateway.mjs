import http from 'http';

const host = "127.0.0.1"; // Is baar raw HTTP directly ise 100% bypass karega
const port = 9007;
const company = "Flexiflair Tech Private Limited";

const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

const options = {
  hostname: host,
  port: port,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml',
    'Content-Length': Buffer.byteLength(xml)
  }
};

console.log(`Connecting to Tally at http://${host}:${port}...`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`SUCCESS! Status: ${res.statusCode}`);
    console.log(`Response: ${data.slice(0, 200)}`);
  });
});

req.on('error', (e) => {
  console.log(`Tally Connection Failed: ${e.message}`);
});

req.write(xml);
req.end();