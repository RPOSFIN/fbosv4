const fs = require('fs');
const path = require('path');
const dir = __dirname;
for (let i = 0; i < 3; i++) {
  const b64 = fs.readFileSync(path.join(dir, `chunk${i}.b64`), 'utf8').trim();
  const js = `(() => { window.__cp.push(atob(${JSON.stringify(b64)})); return window.__cp.length; })()`;
  fs.writeFileSync(path.join(dir, `inject${i}.js`), js);
  console.log('inject' + i + '.js', js.length);
}
