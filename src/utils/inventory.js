// Shared inventory helpers: Backend sheet lookup + Order Quantity calculation.
// Used by both the Upload Report and Confirm order (Approval) pages so the
// mapping/formula lives in ONE place.

// Parse any messy value ("3.00", "-1.00", "52 pcs") into a number
export const parseNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Normalise item names for matching: trim, collapse spaces, lowercase
export const normalizeName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Current Stock: negative values are treated as ZERO (can't have negative stock)
export const currentStock = (v) => Math.max(0, parseNum(v));

// Order Quantity logic (Reorder Level = ROL, Shelf Qty = shelf, Current Stock = stock):
//   if Current Stock <= Reorder Level  ->  Order = max(Shelf Qty - Current Stock, MOQ)
//   else                               ->  Order = 0
export const computeOrderQty = (rol, shelf, stock, moq) => {
  const R = parseNum(rol);
  const S = parseNum(shelf);
  const CS = currentStock(stock); // negatives count as 0
  const M = parseNum(moq);
  if (CS <= R) {
    const order = Math.max(S - CS, M);
    return Math.max(0, Math.round(order));
  }
  return 0;
};

// Build a lookup map from the Backend master list: normalised name -> row
export const buildBackendMap = (backendItems) => {
  const m = new Map();
  (backendItems || []).forEach(b => m.set(normalizeName(b.itemName), b));
  return m;
};

// Enrich an item with Backend data (Item Code / Group / MOQ) + Order Qty.
// If the item has a manual override (orderQtyManual, e.g. edited on the Confirm
// order screen) that value wins; otherwise Order Qty is auto-calculated.
export const enrichItem = (item, backendMap) => {
  const match = backendMap?.get(normalizeName(item.itemName));
  const hasCode = item.item && item.item !== 'N/A' && item.item !== '';
  const itemCode = hasCode ? item.item : (match?.itemCode || '');
  const group = match?.group || item.group;
  const moq = item.moq ?? match?.moq ?? '';
  const hasManualOrder = item.orderQtyManual !== undefined && item.orderQtyManual !== null && item.orderQtyManual !== '';
  const orderQty = hasManualOrder
    ? parseNum(item.orderQtyManual)
    : computeOrderQty(item.roiQty, item.shelf1, item.qty, moq);
  return { ...item, item: itemCode, group, moq, orderQty };
};
