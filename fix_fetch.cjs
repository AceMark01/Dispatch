const fs = require('fs');
const filePath = 'C:/Users/ACER/Downloads/zip_Acemark/t25_Acemark/src/store/dispatchStore.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr1 = `              const delay2 = row[15] || '';
              const status2 = row[16] || '';`;
const replaceStr1 = `              const delay2 = row[15] || '';
              const status2 = row[16] || '';
              const planned3 = parseSheetDate(row[17]);
              const actual3 = parseSheetDate(row[18]);`;

const targetStr2 = `                delay2,
                status2,`;
const replaceStr2 = `                delay2,
                status2,
                planned3,
                actual3,`;

code = code.replace(targetStr1, replaceStr1);
code = code.replace(targetStr2, replaceStr2);

fs.writeFileSync(filePath, code);
console.log('Update Complete.');
