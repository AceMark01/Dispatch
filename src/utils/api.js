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

// Insert many rows in a SINGLE request (one Apps Script call for a whole upload).
// Far faster than calling insertRow once per row.
export const insertRows = async (rowsData, sheetName = 'Report') => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'insertBatch',
        sheetName,
        spreadsheetId: SPREADSHEET_ID,
        rowsData
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error inserting rows:', error);
    throw error;
  }
};

// Send the approved order-confirmation WhatsApp template to a party.
// params = { name, note, link }  -> template {{1}}, {{2}}, {{3}}
export const sendWhatsApp = async (to, params) => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'sendWhatsApp', to, params })
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
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
