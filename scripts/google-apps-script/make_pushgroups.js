const fs = require('fs');
const path = require('path');
const dir = __dirname;
for (let i = 0; i < 4; i++) {
  const g = fs.readFileSync(path.join(dir, `b64group${i}.txt`), 'utf8');
  const js = `(() => { window.__b64 = (window.__b64||'') + ${JSON.stringify(g)}; return (window.__b64||'').length; })()`;
  fs.writeFileSync(path.join(dir, `pushgroup${i}.js`), js);
  console.log('pushgroup' + i + '.js', js.length);
}
