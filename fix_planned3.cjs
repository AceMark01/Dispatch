const fs = require('fs');
const filePath = 'src/store/dispatchStore.js';
let code = fs.readFileSync(filePath, 'utf8');

// Use regex to handle both \r\n and \n
code = code.replace(
  /(const status2 = row\[16\] \|\| '';)(\r?\n)(\r?\n\s+let status)/,
  `$1$2              const planned3 = row[17] ? parseSheetDate(row[17]) : null;$2              const actual3 = row[18] ? parseSheetDate(row[18]) : null;$2$3`
);

code = code.replace(
  /([ ]+status2,)(\r?\n)([ ]+status,)/,
  `$1$2              planned3,$2              actual3,$2$3`
);

fs.writeFileSync(filePath, code);

const hasP3 = code.includes('planned3');
const hasA3 = code.includes('actual3');
console.log('planned3 added:', hasP3, '| actual3 added:', hasA3);
