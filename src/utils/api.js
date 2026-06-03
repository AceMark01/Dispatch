const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

export const fetchSheetData = async (sheetName = 'Report') => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheet=${sheetName}&spreadsheetId=${SPREADSHEET_ID}`);
    const data = await response.json();
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
};

export const insertRow = async (rowData, sheetName = 'Report') => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'insert',
        sheetName,
        spreadsheetId: SPREADSHEET_ID,
        rowData
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error inserting row:', error);
    throw error;
  }
};

export const updateRow = async (rowIndex, rowData, sheetName = 'Report') => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        sheetName,
        spreadsheetId: SPREADSHEET_ID,
        rowIndex,
        rowData
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating row:', error);
    throw error;
  }
};
