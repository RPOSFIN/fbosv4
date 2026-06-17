const fs = require('fs');
const path = require('path');
const dir = __dirname;
const b64 = [
  fs.readFileSync(path.join(dir, 'chunk0.b64'), 'utf8').trim(),
  fs.readFileSync(path.join(dir, 'chunk1.b64'), 'utf8').trim(),
  fs.readFileSync(path.join(dir, 'chunk2.b64'), 'utf8').trim(),
].join('');
const partSize = 1500;
const parts = [];
for (let i = 0; i < b64.length; i += partSize) {
  parts.push(b64.slice(i, i + partSize));
}
parts.forEach((p, i) => {
  fs.writeFileSync(path.join(dir, `b64part${i}.txt`), p);
});
console.log('parts', parts.length);
