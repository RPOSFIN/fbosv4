const fs = require('fs');
const code = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
console.log(JSON.stringify(code));
