const fs = require('fs');
const filePath = 'src/store/dispatchStore.js';
let code = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
const codeNorm = code.replace(/\r\n/g, '\n');

const oldBlock = `        // Fire and forget sync to Google Sheet
        itemsToAdd.forEach(item => {
          get().syncNewItemToSheet(item);
        });`;

const newBlock = `        // Sequential sync to Google Sheet with delay to avoid rate limiting
        (async () => {
          for (const item of itemsToAdd) {
            try {
              await get().syncNewItemToSheet(item);
            } catch (e) {
              console.error('Failed to sync item:', item.serialNo, e);
            }
            // 300ms delay between each request to avoid Google Apps Script rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        })();`;

if (!codeNorm.includes(oldBlock)) {
  console.log('Target not found!');
  const idx = codeNorm.indexOf('Fire and forget');
  console.log(JSON.stringify(codeNorm.substring(idx, idx + 200)));
  process.exit(1);
}

const updated = codeNorm.replace(oldBlock, newBlock);
fs.writeFileSync(filePath, updated);
console.log('Done! Sequential submission with delay applied.');
