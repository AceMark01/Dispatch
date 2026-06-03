const fs = require('fs');
const filePath = 'src/store/dispatchStore.js';
let code = fs.readFileSync(filePath, 'utf8');

// Replace the entire postDispatchToSheet function
const oldFn = `      // Post a dispatch transaction row to the 'Dispatch' sheet
      postDispatchToSheet: async (itemObj, dispatchedQty, remainingQty, remark, dispatchDate) => {
        try {
          const { insertRow } = await import('../utils/api');
          // Columns: Confirm Actual 2 date, Serial No., Item Name, Group, Item,
          //          Remark, Ordered Qty, Dispatched Qty, Remaining Qty, unit, status, Dispatch Date
          const orderedQty = Number(itemObj.qty || 0) + Number(dispatchedQty || 0);
          const rowData = [
            formatDateTime(itemObj.actual2 || itemObj.confirmedAt), // Confirm Actual 2 date
            itemObj.serialNo || '',                                  // Serial No.
            itemObj.itemName || '',                                  // Item Name
            itemObj.group || '',                                     // Group
            itemObj.item || '',                                      // Item
            remark || itemObj.remark || '',                         // Remark
            orderedQty || itemObj.roiQty || '',                     // Ordered Qty
            dispatchedQty || '',                                     // Dispatched Qty
            remainingQty >= 0 ? remainingQty : '',                  // Remaining Qty
            itemObj.unit || '',                                      // unit
            'Dispatched',                                            // status
            formatDateTime(dispatchDate || new Date().toISOString()) // Dispatch Date
          ];
          await insertRow(rowData, 'Dispatch');
        } catch (error) {
          console.error("Failed to post dispatch to Dispatch sheet:", error);
        }
      },`;

const newFn = `      // Post a dispatch transaction row to the 'Dispatch' sheet
      postDispatchToSheet: async (itemObj, dispatchedQty, remainingQty, remark, dispatchDate) => {
        try {
          const { insertRow, fetchSheetData } = await import('../utils/api');

          // Generate unique Dispatch No. (DI-XXX) by reading max from Dispatch sheet
          let maxId = 0;
          try {
            const dispatchRaw = await fetchSheetData('Dispatch');
            if (dispatchRaw && dispatchRaw.length > 0) {
              dispatchRaw.forEach(r => {
                const val = String(r[2] || '').trim(); // Column C is index 2
                if (val.startsWith('DI-')) {
                  const num = parseInt(val.replace('DI-', ''), 10);
                  if (!isNaN(num) && num > maxId) maxId = num;
                }
              });
            }
          } catch (e) { /* Dispatch sheet may be empty */ }
          const dispatchNo = \`DI-\${String(maxId + 1).padStart(3, '0')}\`;

          // Columns: A: Confirm Actual 2 date, B: Serial No., C: Dispatch No.,
          //          D: Item Name, E: Group, F: Item, G: Remark,
          //          H: Ordered Qty, I: Dispatched Qty, J: Remaining Qty,
          //          K: unit, L: status, M: Dispatch Date
          const orderedQty = Number(itemObj.qty || 0) + Number(dispatchedQty || 0);
          const rowData = [
            formatDateTime(itemObj.actual2 || itemObj.confirmedAt), // A: Confirm Actual 2 date
            itemObj.serialNo || '',                                  // B: Serial No.
            dispatchNo,                                              // C: Dispatch No. (DI-XXX)
            itemObj.itemName || '',                                  // D: Item Name
            itemObj.group || '',                                     // E: Group
            itemObj.item || '',                                      // F: Item
            remark || itemObj.remark || '',                          // G: Remark
            orderedQty || itemObj.roiQty || '',                      // H: Ordered Qty
            dispatchedQty || '',                                     // I: Dispatched Qty
            remainingQty >= 0 ? remainingQty : '',                   // J: Remaining Qty
            itemObj.unit || '',                                      // K: unit
            'Dispatched',                                            // L: status
            formatDateTime(dispatchDate || new Date().toISOString()) // M: Dispatch Date
          ];
          await insertRow(rowData, 'Dispatch');
        } catch (error) {
          console.error("Failed to post dispatch to Dispatch sheet:", error);
        }
      },`;

// Normalize line endings before replace
const oldFnNorm = oldFn.replace(/\r\n/g, '\n');
const codeNorm = code.replace(/\r\n/g, '\n');

if (!codeNorm.includes(oldFnNorm)) {
  console.log('Target not found! Dumping current postDispatchToSheet:');
  const idx = codeNorm.indexOf('postDispatchToSheet');
  console.log(JSON.stringify(codeNorm.substring(idx, idx + 600)));
  process.exit(1);
}

const updatedCode = codeNorm.replace(oldFnNorm, newFn);
fs.writeFileSync(filePath, updatedCode);
console.log('Done! dispatchNo added at Column C.');
