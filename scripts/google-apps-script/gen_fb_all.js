const fs = require("fs");
const path = require("path");
const dir = __dirname;
let combined = "(()=>{window.__fb='';";
for (let i = 0; i < 4; i++) {
  const inj = fs.readFileSync(path.join(dir, "fb_inj" + i + ".js"), "utf8");
  const inner = inj.replace(/^\(\(\)=>\{/, "").replace(/return window\.__fb\.length;\}\)\(\)$/, "");
  combined += inner;
}
combined += fs.readFileSync(path.join(dir, "fb_apply.js"), "utf8").replace(/^\(\(\)=>\{/, "").replace(/\}\)\(\)$/, "");
combined += "})()";
fs.writeFileSync(path.join(dir, "fb_all.js"), combined);
console.log("fb_all.js", combined.length);
