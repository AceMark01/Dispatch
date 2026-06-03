const fs = require('fs');
const filePath = 'C:/Users/ACER/Downloads/zip_Acemark/t25_Acemark/src/store/dispatchStore.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `            formatDateTime(itemObj.planned1 || itemObj.uploadedAt || new Date().toISOString()),
            formatDateTime(itemObj.actual1),
            itemObj.delay1 || '',
            itemObj.status1 || "Approval's Pending",
            formatDateTime(itemObj.planned2),
            formatDateTime(itemObj.actual2),
            itemObj.delay2 || '',
            itemObj.status2 || ''`;

const replaceStr = `            null, // J
            formatDateTime(itemObj.actual1), // K
            null, // L
            null, // M
            null, // N
            formatDateTime(itemObj.actual2), // O
            null, // P
            null // Q`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync(filePath, code);
console.log('Update Complete.');
