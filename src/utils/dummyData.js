export const generateDummyData = () => {
  const items = [];
  const groups = ['Electronics', 'Mechanical', 'Raw Material', 'Packaging', 'Tools'];
  const units = ['PCS', 'KGS', 'MTR', 'SET', 'NOS'];
  
  for (let i = 1; i <= 100; i++) {
    items.push({
      id: `ITEM-${1000 + i}`,
      serialNo: i,
      itemDetails: `Product ${String.fromCharCode(65 + (i % 26))}${i}`,
      group: groups[i % groups.length],
      itemCode: `CODE-${2000 + i}`,
      qty: Math.floor(Math.random() * 500) + 1,
      unit: units[i % units.length],
      status: i <= 20 ? 'Dispatched' : 
              i <= 40 ? 'Confirmed' : 
              i <= 70 ? 'Approved' : 'Waiting for Approval',
      uploadedAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      approvedAt: i <= 70 ? new Date().toISOString() : null,
      confirmedAt: i <= 40 ? new Date().toISOString() : null,
      dispatchedAt: i <= 20 ? new Date().toISOString() : null,
      confirmStatus: i <= 40 ? 'Yes' : null
    });
  }
  return items;
};
