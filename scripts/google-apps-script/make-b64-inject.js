const fs = require("fs");
const p1 = fs.readFileSync(__dirname + "/inject-part1.txt", "utf8");
const p2 = fs.readFileSync(__dirname + "/inject-part2.txt", "utf8");
const expr1 =
  '(()=>{eval(atob("' + Buffer.from(p1).toString("base64") + '"));return "part1";})()';
const expr2 =
  '(()=>{eval(atob("' + Buffer.from(p2).toString("base64") + '"));return "part2";})()';
fs.writeFileSync(__dirname + "/inject-b64-part1.txt", expr1);
fs.writeFileSync(__dirname + "/inject-b64-part2.txt", expr2);
console.log("e1", expr1.length, "e2", expr2.length);
