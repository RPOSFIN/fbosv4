const fs = require('fs');
const path = require('path');
const dir = __dirname;
for (let i = 0; i < 4; i++) {
  const g = fs.readFileSync(path.join(dir, `b64group${i}.txt`), 'utf8');
  const half = Math.ceil(g.length / 2);
  fs.writeFileSync(path.join(dir, `b64g${i}a.txt`), g.slice(0, half));
  fs.writeFileSync(path.join(dir, `b64g${i}b.txt`), g.slice(half));
  console.log(`g${i}a`, g.slice(0, half).length, 'g${i}b', g.slice(half).length);
}
