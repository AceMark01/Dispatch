const fs = require('fs');
let code = fs.readFileSync('C:/Users/ACER/Downloads/zip_Acemark/t25_Acemark/src/store/dispatchStore.js', 'utf8');

// 1. Remove persist
code = code.replace("import { persist } from 'zustand/middleware';\n", "");
code = code.replace("export const useDispatchStore = create(\n  persist(\n    (set, get) => ({", "export const useDispatchStore = create(\n    (set, get) => ({");
code = code.replace("    }),\n    {\n      name: 'dispatch-storage',\n    }\n  )\n);", "    })\n);");

// 2. Add nextDispatchNo
code = code.replace("      error: null,", "      error: null,\n      nextDispatchNo: 1,");

// 3. Update fetchFromSheet for Dispatch sheet
const fetchOld = `            // Fetch Dispatch sheet and reconstruct dispatched items
            let finalItems = mappedItems;
            try {
              const dispatchRaw = await fetchSheetData('Dispatch');
              // Dispatch columns: Confirm Actual 2 date(0), Serial No.(1), Item Name(2),
              // Group(3), Item(4), Remark(5), Ordered Qty(6), Dispatched Qty(7),
              // Remaining Qty(8), unit(9), status(10), Dispatch Date(11)
              if (dispatchRaw && dispatchRaw.length > 0) {
                const dispatchRows = dispatchRaw.filter(r => r[1] || r[2]);
                dispatchRows.forEach(dRow => {
                  const serialNo = dRow[1] || '';
                  const dispatchedQty = Number(dRow[7]) || 0;
                  const orderedQty = Number(dRow[6]) || 0;
                  const remainingQty = Number(dRow[8]) || 0;
                  const dispatchDate = parseSheetDate(dRow[11]);
                  const remark = dRow[5] || '';`;

const fetchNew = `            // Fetch Dispatch sheet and reconstruct dispatched items
            let finalItems = mappedItems;
            try {
              const dispatchRaw = await fetchSheetData('Dispatch');
              
              let maxId = 0;
              if (dispatchRaw && dispatchRaw.length > 0) {
                dispatchRaw.forEach(r => {
                  const val = String(r[2] || '').trim();
                  if (val.startsWith('DI-')) {
                    const num = parseInt(val.replace('DI-', ''), 10);
                    if (!isNaN(num) && num > maxId) maxId = num;
                  }
                });
              }
              set({ nextDispatchNo: maxId + 1 });

              // Dispatch columns: Confirm Actual 2 date(0), Serial No.(1), Dispatch No.(2), Item Name(3),
              // Group(4), Item(5), Remark(6), Ordered Qty(7), Dispatched Qty(8),
              // Remaining Qty(9), unit(10), status(11), Dispatch Date(12)
              if (dispatchRaw && dispatchRaw.length > 0) {
                const dispatchRows = dispatchRaw.filter(r => r[1] || r[3]);
                dispatchRows.forEach(dRow => {
                  const serialNo = dRow[1] || '';
                  const dispatchNo = dRow[2] || '';
                  const dispatchedQty = Number(dRow[8]) || 0;
                  const orderedQty = Number(dRow[7]) || 0;
                  const remainingQty = Number(dRow[9]) || 0;
                  const dispatchDate = parseSheetDate(dRow[12]);
                  const remark = dRow[6] || '';`;
code = code.replace(fetchOld, fetchNew);

// 4. Update syncNewItemToSheet (null for formula columns)
const syncNewOld = `            itemObj.unit || '',
            '',                                   // J — planned1 formula
            '',                                   // K — actual1
            '',                                   // L — delay1 formula
            itemObj.status1 || "Approval's Pending",
            '',                                   // N — planned2 formula
            '',                                   // O — actual2
            '',                                   // P — delay2 formula
            itemObj.status2 || ''                 // Q
          ];`;
const syncNewNew = `            itemObj.unit || '',
            null,                                 // J — blank (null prevents overwrite)
            '',                                   // K — actual1
            null,                                 // L — blank
            itemObj.status1 || "Approval's Pending",
            null,                                 // N — blank
            '',                                   // O — actual2
            null,                                 // P — blank
            itemObj.status2 || '',                // Q
            null,                                 // R
            null                                  // S
          ];`;
code = code.replace(syncNewOld, syncNewNew);

// 5. Update syncItemToSheet (add Dispatched guard, null for formula columns, add R/S)
const syncItemOld = `      syncItemToSheet: async (itemObj) => {
        // Guard: skip Report update if confirmStatus is 'No' (rejected confirmation)
        if (itemObj.status === 'Confirmed' && itemObj.confirmStatus !== 'Yes') {`;
const syncItemNew = `      syncItemToSheet: async (itemObj) => {
        // Guard: skip Report update if status is Dispatched (handled by postDispatchToSheet)
        if (itemObj.status === 'Dispatched') {
          return;
        }
        // Guard: skip Report update if confirmStatus is 'No' (rejected confirmation)
        if (itemObj.status === 'Confirmed' && itemObj.confirmStatus !== 'Yes') {`;
code = code.replace(syncItemOld, syncItemNew);

const syncItemArrayOld = `            itemObj.unit || '',
            '',                                   // J — planned1 formula
            formatDateTime(itemObj.actual1),      // K
            '',                                   // L — delay1 formula
            itemObj.status1 || '',                // M
            '',                                   // N — planned2 formula
            formatDateTime(itemObj.actual2),      // O
            '',                                   // P — delay2 formula
            isApprovalAction ? '' : (itemObj.status2 || '') // Q — blank on approval
          ];`;
const syncItemArrayNew = `            itemObj.unit || '',
            null,                                 // J — blank (null prevents overwrite)
            formatDateTime(itemObj.actual1),      // K
            null,                                 // L — blank
            itemObj.status1 || '',                // M
            null,                                 // N — blank
            formatDateTime(itemObj.actual2),      // O
            null,                                 // P — blank
            isApprovalAction ? null : (itemObj.status2 || ''), // Q — blank on approval
            null,                                 // R — Planned 3 (blank formula)
            itemObj.status === 'Dispatched' ? formatDateTime(itemObj.dispatchedAt || new Date().toISOString()) : null // S — Actual 3
          ];`;
code = code.replace(syncItemArrayOld, syncItemArrayNew);

// 6. Update partialDispatch
const partialOld = `        // Post dispatch transaction to 'Dispatch' sheet (not Report)
        get().postDispatchToSheet(updatedOriginal, dQty, remainingQty, remark || item.remark, dispatchedAt);`;
const partialNew = `        const currentDispatchNo = state.nextDispatchNo;
        const formattedDispatchNo = \`DI-\${String(currentDispatchNo).padStart(3, '0')}\`;

        // Post dispatch transaction
        get().postDispatchToSheet(updatedOriginal, dQty, remainingQty, remark || item.remark, dispatchedAt, formattedDispatchNo);
        updatedItems = state.items.map(i => i.id === id ? { ...updatedOriginal, dispatchNo: formattedDispatchNo } : i);`;
code = code.replace(partialOld, partialNew);
code = code.replace("return { items: updatedItems };", "return { nextDispatchNo: currentDispatchNo + 1, items: updatedItems };");

// 7. Update postDispatchToSheet
const postDispatchOld = `      postDispatchToSheet: async (itemObj, dispatchedQty, remainingQty, remark, dispatchDate) => {
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
const postDispatchNew = `      postDispatchToSheet: async (itemObj, dispatchedQty, remainingQty, remark, dispatchDate, dispatchNo) => {
        try {
          const { updateRow, insertRow, fetchSheetData } = await import('../utils/api');
          
          let rowIndex = itemObj._rowIndex;
          if (!rowIndex) {
            const rawData = await fetchSheetData('Report');
            if (rawData && rawData.length > 6) {
              const dataRows = rawData.slice(6);
              const foundIdx = dataRows.findIndex(
                row => String(row[1]).trim() === String(itemObj.serialNo).trim()
              );
              if (foundIdx !== -1) {
                rowIndex = foundIdx + 7;
                set(state => ({
                  items: state.items.map(i => i.id === itemObj.id ? { ...i, _rowIndex: rowIndex } : i)
                }));
              }
            }
          }

          if (rowIndex) {
            // Per user request: ONLY update column S (Actual 3) and column H (Qty)
            const rowData = [
              '', // A (0)
              '', // B (1)
              '', // C (2)
              '', // D (3)
              '', // E (4)
              '', // F (5)
              '', // G (6)
              itemObj.qty, // H (7) - Qty
              '', // I (8)
              null, // J (9) - Formula
              '', // K (10)
              null, // L (11) - Formula
              '', // M (12)
              null, // N (13) - Formula
              '', // O (14)
              null, // P (15) - Formula
              null, // Q (16) - Formula
              null, // R (17) - Formula
              formatDateTime(dispatchDate || new Date().toISOString()) // S (18) - Actual 3
            ];
            await updateRow(rowIndex, rowData, 'Report');
          }

          // INSERT INTO DISPATCH SHEET
          const orderedQty = Number(itemObj.qty || 0) + Number(dispatchedQty || 0);
          const dispatchRowData = [
            formatDateTime(itemObj.actual2 || itemObj.confirmedAt), // A: Confirm Actual 2 date
            itemObj.serialNo || '',                                  // B: Serial No.
            dispatchNo || '',                                        // C: Dispatch No.
            itemObj.itemName || '',                                  // D: Item Name
            itemObj.group || '',                                     // E: Group
            itemObj.item || '',                                      // F: Item
            remark || itemObj.remark || '',                          // G: Remark
            orderedQty || itemObj.roiQty || '',                      // H: Ordered Qty
            dispatchedQty || '',                                     // I: Dispatched Qty
            remainingQty >= 0 ? remainingQty : '',                   // J: Remaining Qty
            itemObj.unit || '',                                      // K: unit
            itemObj.status2 || 'Dispatched',                         // L: status
            formatDateTime(dispatchDate || new Date().toISOString()) // M: Dispatch Date
          ];
          await insertRow(dispatchRowData, 'Dispatch');
        } catch (error) {
          console.error("Failed to post dispatch:", error);
        }
      },`;
code = code.replace(postDispatchOld, postDispatchNew);

fs.writeFileSync('C:/Users/ACER/Downloads/zip_Acemark/t25_Acemark/src/store/dispatchStore.js', code);
console.log('Update Complete. File Length: ' + code.length);
