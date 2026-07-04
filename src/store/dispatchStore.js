import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const parseSheetDate = (dateStr) => {
  if (!dateStr) return null;

  // Try ISO string first (e.g. from internal state)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  // Parse DD/MM/YY HH:MM AM/PM — this is what formatDateTime writes to the sheet
  // Example: "01/06/26 4:14 PM" means 1st June 2026
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s+(AM|PM))?$/i);
  if (match) {
    const [_, day, month, year, hours, minutes, seconds, ampm] = match;
    let h = parseInt(hours, 10);
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    let y = parseInt(year, 10);
    if (y < 100) y += 2000;
    // Day comes BEFORE month: DD/MM/YY
    const d = new Date(y, parseInt(month, 10) - 1, parseInt(day, 10), h, parseInt(minutes, 10), seconds ? parseInt(seconds, 10) : 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return dateStr;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const p = n => n.toString().padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}`;
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const time = `${p(hours)}:${p(d.getMinutes())} ${ampm}`;
  return `${date} ${time}`;
};

const calculateDelay = (plannedStr, actualStr) => {
  if (!plannedStr || !actualStr) return '';
  const p = new Date(plannedStr);
  const a = new Date(actualStr);
  if (isNaN(p.getTime()) || isNaN(a.getTime())) return '';
  const diffMs = a - p;
  if (diffMs < 0) return '0 hrs';
  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHrs < 24) {
    return `${diffHrs} hrs`;
  }
  const diffDays = Math.round(diffHrs / 24);
  return `${diffDays} days`;
};

const computeSheetFields = (item, newStatus, extraData = {}) => {
  const updated = { ...item, ...extraData, status: newStatus };

  if (newStatus === 'Waiting for Approval') {
    updated.status1 = "Approval's Pending";
    updated.planned1 = updated.planned1 || updated.uploadedAt || new Date().toISOString();
    updated.actual1 = null;
    updated.delay1 = '';
    updated.planned2 = null;
    updated.actual2 = null;
    updated.delay2 = '';
    updated.status2 = '';
  } else if (newStatus === 'Approved') {
    updated.status1 = 'Approved';
    updated.actual1 = updated.approvedAt || new Date().toISOString();
    updated.approvedAt = updated.actual1;
    updated.delay1 = calculateDelay(updated.planned1 || updated.uploadedAt, updated.actual1);
    updated.planned2 = updated.actual1;
  } else if (newStatus === 'Rejected') {
    updated.status1 = 'Rejected';
    updated.actual1 = updated.approvedAt || new Date().toISOString();
    updated.approvedAt = updated.actual1;
    updated.delay1 = calculateDelay(updated.planned1 || updated.uploadedAt, updated.actual1);
    updated.planned2 = null;
    updated.actual2 = null;
    updated.delay2 = '';
    updated.status2 = '';
  } else if (newStatus === 'Confirmed') {
    updated.status1 = 'Approved';
    if (!updated.actual1) {
      updated.actual1 = updated.approvedAt || new Date().toISOString();
      updated.approvedAt = updated.actual1;
    }
    if (!updated.planned2) {
      updated.planned2 = updated.actual1;
    }
    updated.status2 = updated.confirmStatus || 'Yes';
    updated.actual2 = updated.confirmedAt || new Date().toISOString();
    updated.confirmedAt = updated.actual2;
    updated.delay2 = calculateDelay(updated.planned2, updated.actual2);
  } else if (newStatus === 'Dispatched') {
    updated.status1 = 'Approved';
    if (!updated.actual1) {
      updated.actual1 = updated.approvedAt || new Date().toISOString();
      updated.approvedAt = updated.actual1;
    }
    if (!updated.planned2) {
      updated.planned2 = updated.actual1;
    }
    updated.status2 = 'Dispatched';
    updated.actual2 = updated.dispatchedAt || new Date().toISOString();
    updated.dispatchedAt = updated.actual2;
    updated.delay2 = calculateDelay(updated.planned2, updated.actual2);
  }

  return updated;
};

export const useDispatchStore = create(
  persist(
    (set, get) => ({
      items: [],
      backendItems: [],
      isLoading: false,
      error: null,
      nextDispatchNo: 1,

      // Add items (e.g. from Excel)
      addItems: (newItems) => set((state) => {
        const itemsToAdd = newItems.map(item => {
          const uploadedAt = item.uploadedAt || new Date().toISOString();
          const baseItem = {
            ...item,
            id: item.id || Math.random().toString(36).substr(2, 9),
            uploadedAt,
            approvedAt: null,
            confirmedAt: null,
            dispatchedAt: null,
            confirmStatus: null,
            remark: item.remark || ''
          };
          return computeSheetFields(baseItem, 'Waiting for Approval');
        });

        // Sequential sync to Google Sheet with delay to avoid rate limiting
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
        })();

        return { items: [...state.items, ...itemsToAdd] };
      }),

      // Update item status
      updateItemStatus: (id, status, extraData = {}) => set((state) => {
        const updatedItems = state.items.map(item =>
          item.id === id ? computeSheetFields(item, status, extraData) : item
        );

        const itemToSync = updatedItems.find(i => i.id === id);
        if (itemToSync) {
          get().syncItemToSheet(itemToSync);
        }

        return { items: updatedItems };
      }),

      // Bulk update (for Confirm and Dispatch pages)
      bulkUpdateStatus: (ids, status, extraData = {}) => set((state) => {
        const updatedItems = state.items.map(item =>
          ids.includes(item.id) ? computeSheetFields(item, status, extraData) : item
        );

        // Sequential sync with delay to avoid Google Apps Script rate limits
        (async () => {
          const itemsToSync = updatedItems.filter(item => ids.includes(item.id));
          for (const item of itemsToSync) {
            try {
              await get().syncItemToSheet(item);
            } catch (e) {
              console.error('Failed to sync item:', item.serialNo, e);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        })();

        return { items: updatedItems };
      }),

      // Partial dispatch logic
      partialDispatch: (id, dispatchedQty, remark) => set((state) => {
        const item = state.items.find(i => i.id === id);
        if (!item) return state;

        const originalQty = Number(item.qty);
        const dQty = Number(dispatchedQty);
        const remainingQty = originalQty - dQty;
        const dispatchedAt = new Date().toISOString();

        const updatedOriginal = {
          ...computeSheetFields(item, 'Dispatched', {
            qty: dQty,
            remark: remark || item.remark,
            dispatchedAt
          }),
          actual3: dispatchedAt,  // set immediately so pending→history filter updates in UI
          pendingQty: 0             // Column V: 0 = fully dispatched → moves to History
        };

        let updatedItems = state.items.map(i =>
          i.id === id ? updatedOriginal : i
        );

        // Post dispatch transaction to 'Dispatch' sheet (not Report)
        get().postDispatchToSheet(updatedOriginal, dQty, remainingQty, remark || item.remark, dispatchedAt);

        if (remainingQty > 0) {
          const splitItem = computeSheetFields({
            ...item,
            id: `SPLIT-${Math.random().toString(36).substr(2, 9)}`,
            qty: remainingQty,
            serialNo: item.serialNo,
            remark: `Remaining from ${item.id}`,
            uploadedAt: new Date().toISOString(),
          }, 'Confirmed', {
            confirmStatus: item.confirmStatus || 'Yes',
            confirmedAt: item.confirmedAt || new Date().toISOString(),
          });

          updatedItems = [...updatedItems, splitItem];
          // Split item stays in Report as Confirmed/Yes
          get().syncNewItemToSheet(splitItem);
        }

        return { items: updatedItems };
      }),

      // Reset items (for testing)
      setItems: (items) => set({ items }),

      // ==========================================
      // GOOGLE SHEETS INTEGRATION
      // ==========================================

      // Fetch all data from Google Sheet (Report + Dispatch)
      fetchFromSheet: async () => {
        set({ isLoading: true, error: null });
        try {
          const { fetchSheetData } = await import('../utils/api');

          // Fetch Report sheet
          const rawData = await fetchSheetData('Report');

          if (rawData && rawData.length > 6) {
            const dataRows = rawData.slice(6);
            const mappedItems = dataRows.map((row, index) => {
              if (!row[1] && !row[2]) return null;

              const uploadedAt = parseSheetDate(row[0]) || new Date().toISOString();
              const planned1 = parseSheetDate(row[9]) || uploadedAt;
              const approvedAt = parseSheetDate(row[10]);
              const delay1 = row[11] || '';
              const status1 = row[12] || '';
              // Column N now stores the saved Order Qty (a plain number). Read it back
              // so the approved/rejected order quantity persists across reloads.
              const nRaw = row[13];
              const orderQtyManual = (nRaw !== '' && nRaw != null && /^\s*\d+(\.\d+)?\s*$/.test(String(nRaw))) ? Number(nRaw) : undefined;
              const planned2 = parseSheetDate(row[13]);
              const confirmedAt = parseSheetDate(row[14]);
              const delay2 = row[15] || '';
              const status2 = row[16] || '';
              const planned3 = row[17] ? parseSheetDate(row[17]) : null;
              const actual3 = row[18] ? parseSheetDate(row[18]) : null;

              let status = 'Waiting for Approval';
              let confirmStatus = null;
              let dispatchedAt = null;

              if (status2 === 'Dispatched') {
                status = 'Dispatched';
                dispatchedAt = confirmedAt;
              } else if (status2 === 'Yes' || status2 === 'No') {
                status = 'Confirmed';
                confirmStatus = status2;
              } else if (status1 === 'Approved') {
                status = 'Approved';
              } else if (status1 === 'Rejected') {
                status = 'Rejected';
              }

              return {
                id: `SHEET-${index}-${row[1]}`,
                _rowIndex: index + 7,
                uploadedAt,
                serialNo: row[1] || '',
                itemName: row[2] || '',
                group: row[3] || '',
                item: row[4] || '',
                roiQty: row[5] || '',
                shelf1: row[6] || '',
                qty: row[7] || '',
                unit: row[8] || '',
                planned1,
                approvedAt,
                actual1: approvedAt,
                delay1,
                status1,
                planned2,
                confirmedAt,
                actual2: confirmedAt,
                delay2,
                status2,
              planned3,
              actual3,
                status,
                confirmStatus,
                dispatchedAt,
                orderQtyManual,
                remark: '',
                orderedQty: Number(row[7]) || 0,
                dispatchedQty: 0,
                remainingQty: Number(row[7]) || 0,
                pendingQty: Number(row[21]) || 0,   // Column V: Pending (remaining)
                totalDispatch: Number(row[20]) || 0  // Column U: Total Dispatch
              };
            }).filter(Boolean);

            // Dispatch sheet/flow has been removed from the app, so we only use the Report sheet.
            set({ items: mappedItems, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ error: error.message, isLoading: false });
          console.error("Failed to fetch from sheet:", error);
        }
      },

      // Fetch the Backend master sheet (Item Name | Group | Item Code | MOQ)
      // Header is at row 1, data starts at row 2.
      fetchBackendData: async () => {
        try {
          const { fetchSheetData } = await import('../utils/api');
          const raw = await fetchSheetData('Backend');
          if (raw && raw.length > 1) {
            const backendItems = raw.slice(1).map(r => ({
              itemName: (r[0] || '').toString().trim(),
              group: (r[1] || '').toString().trim(),
              itemCode: (r[2] || '').toString().trim(),
              moq: (r[3] || '').toString().trim(),
            })).filter(b => b.itemName);
            set({ backendItems });
          }
        } catch (error) {
          console.error('Failed to fetch Backend sheet:', error);
        }
      },

      // Sync a single new item to Google Sheet
      syncNewItemToSheet: async (itemObj) => {
        try {
          const { insertRow } = await import('../utils/api');

          const rowData = [
            formatDateTime(itemObj.uploadedAt || new Date().toISOString()),
            itemObj.serialNo || '',
            itemObj.itemName || '',
            itemObj.group || '',
            itemObj.item || '',
            itemObj.roiQty || '',
            itemObj.shelf1 || '',
            itemObj.qty || '',
            itemObj.unit || '',
            null, // J
            formatDateTime(itemObj.actual1), // K
            null, // L
            null, // M
            null, // N
            formatDateTime(itemObj.actual2), // O
            null, // P
            null // Q
          ];
          await insertRow(rowData, 'Report');
        } catch (error) {
          console.error("Failed to sync new item to sheet:", error);
        }
      },

      // Sync updated item to Google Sheet row
      // Only writes to Report sheet when status2 is 'Yes' (confirmed affirmatively)
      // Dispatches go to the Dispatch sheet via postDispatchToSheet instead
      // Auto-resolves missing _rowIndex by searching sheet by Serial No.
      syncItemToSheet: async (itemObj) => {
        // Guard: skip Report update if status is Dispatched (handled by postDispatchToSheet)
        if (itemObj.status === 'Dispatched') {
          return;
        }
        // Guard: skip Report update if confirmStatus is 'No' (rejected confirmation)
        if (itemObj.status === 'Confirmed' && itemObj.confirmStatus !== 'Yes') {
          console.info('Skipping Report sync: confirmStatus is not Yes', itemObj.serialNo);
          return;
        }
        try {
          const { updateRow, fetchSheetData } = await import('../utils/api');

          let rowIndex = itemObj._rowIndex;

          // If _rowIndex is unknown (items added locally without prior fetch),
          // resolve it by finding the row in the sheet by Serial No.
          if (!rowIndex) {
            console.info('Resolving _rowIndex for', itemObj.serialNo, '...');
            const rawData = await fetchSheetData('Report');
            if (rawData && rawData.length > 6) {
              const dataRows = rawData.slice(6);
              const foundIdx = dataRows.findIndex(
                row => String(row[1]).trim() === String(itemObj.serialNo).trim()
              );
              if (foundIdx !== -1) {
                rowIndex = foundIdx + 7; // +7 because data starts at sheet row 7
                // Cache the resolved index back into local state
                set(state => ({
                  items: state.items.map(i =>
                    i.id === itemObj.id ? { ...i, _rowIndex: rowIndex } : i
                  )
                }));
                console.info('Resolved _rowIndex:', rowIndex, 'for Serial No.', itemObj.serialNo);
              }
            }
          }

          if (!rowIndex) {
            console.warn('Could not resolve row in sheet for Serial No.:', itemObj.serialNo);
            return;
          }

          const rowData = [
            formatDateTime(itemObj.uploadedAt),
            itemObj.serialNo || '',
            itemObj.itemName || '',
            itemObj.group || '',
            itemObj.item || '',
            itemObj.roiQty || '',
            itemObj.shelf1 || '',
            itemObj.qty || '',
            itemObj.unit || '',
            null,                                                    // J: Planned 1 (formula - do not write)
            formatDateTime(itemObj.actual1),                         // K: Actual 1
            null,                                                    // L: Delay 1 (formula - do not write)
            itemObj.status1 || '',                                   // M: Status 1 (Approved / Rejected)
            // N: Order Qty (only write when we have a value; else leave the cell untouched)
            (itemObj.orderQtyManual !== undefined && itemObj.orderQtyManual !== null && itemObj.orderQtyManual !== '')
              ? itemObj.orderQtyManual
              : null,
            formatDateTime(itemObj.actual2),                         // O: Actual 2
            null,                                                    // P: Delay 2 (formula - do not write)
            itemObj.status2 || ''                                    // Q: Status 2
          ];
          await updateRow(rowIndex, rowData, 'Report');
        } catch (error) {
          console.error("Failed to sync item update to sheet:", error);
        }
      },

      // Post a dispatch transaction row to the 'Dispatch' sheet
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
          const dispatchNo = `DI-${String(maxId + 1).padStart(3, '0')}`;

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
      },
    }),
    {
      name: 'dispatch-storage',
    }
  )
);
