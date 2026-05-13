/**
 * Setup and Configuration
 * 
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions -> Apps Script (Tiện ích mở rộng -> Apps Script).
 * 3. Copy and paste this entire code into Code.gs (xóa hết code mặc định đi rồi paste vào).
 * 4. Replace 'SPREADSHEET_ID_HERE' with your actual spreadsheet ID (found in the URL).
 * 5. Select the 'setupSheets' function from the dropdown and click 'Run' to create all sheets and columns.
 * 6. Go to Deploy -> New deployment.
 * 7. Select type: 'Web app'.
 * 8. Execute as: 'Me'.
 * 9. Who has access: 'Anyone' (Bất kỳ ai).
 * 10. Click 'Deploy' and copy the 'Web app URL'. Dùng URL này để gọi API từ Javascript/React.
 */

const SPREADSHEET_ID = ''; // Để trống nếu Script này được tạo từ 'Tiện ích mở rộng' bên trong Google Sheet

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.length > 5) {
    try { 
      return SpreadsheetApp.openById(SPREADSHEET_ID); 
    } catch (e) { 
      console.error("Lỗi khi mở Spreadsheet bằng ID:", e);
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    console.error("Lỗi khi lấy Active Spreadsheet:", e);
    return null;
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet;
    const ss = getSpreadsheet();
    
    if (!ss) {
      return response({ 
        success: false, 
        error: "Không thể kết nối với Google Sheet. Hãy kiểm tra SPREADSHEET_ID hoặc đảm bảo Script được tạo từ Tiện ích mở rộng của Sheet." 
      });
    }

    if (action === 'getAllData') {
      const data = {
        booking: getSheetData('booking'),
        Branches: getSheetData('Branches'),
        Rooms: getSheetData('Rooms'),
        Employees: getSheetData('Employees'),
        Services: getSheetData('Services'),
        Transactions: getSheetData('Transactions'),
        logs: getSheetData('logs'),
        Attendance: getSheetData('Attendance'),
        Wallets: getSheetData('Wallets')
      };
      return response({ success: true, data: data });
    } else if (action === 'getData' && sheetName) {
      return response({ success: true, data: getSheetData(sheetName) });
    } else if (action === 'test') {
      return response({ 
        success: true, 
        message: "Kết nối thành công", 
        spreadsheetName: ss.getName(),
        time: new Date().toISOString() 
      });
    }
    
    return response({ success: false, error: "Tham số action không hợp lệ hoặc thiếu sheetName" });
  } catch (error) {
    return response({ success: false, error: error.toString(), stack: error.stack });
  }
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return response({ success: false, error: "Không có dữ liệu POST" });
    }
    
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const sheetName = requestData.sheet;
    const payload = requestData.payload;
    
    if (!sheetName || !payload) {
      return response({ success: false, error: "Thiếu sheetName hoặc payload" });
    }

    if (action === 'create') {
      const result = appendRow(sheetName, payload);
      return response({ success: true, data: result });
    } else if (action === 'update') {
      const result = updateRow(sheetName, payload);
      return response({ success: !!result, data: result, error: result ? null : "Không tìm thấy ID" });
    } else if (action === 'delete') {
      const result = deleteRow(sheetName, payload.id);
      return response({ success: !!result, data: result, error: result ? null : "Không tìm thấy ID" });
    }
    
    return response({ success: false, error: "Hành động không hợp lệ" });
  } catch (error) {
    return response({ success: false, error: error.toString() });
  }
}

// ----- CÁC HÀM XỬ LÝ LÕI -----

function getSheetData(sheetName) {
  try {
    const ss = getSpreadsheet();
    if (!ss) return [];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; 
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.filter(row => {
      // Bỏ qua dòng trống
      return row.some(cell => cell !== "");
    }).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (!header) return;
        let val = row[index];
        // Parse JSON strings
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        obj[header] = val;
      });
      return obj;
    });
  } catch (e) {
    console.error(`Error reading sheet ${sheetName}:`, e);
    return [];
  }
}

function appendRow(sheetName, payload) {
  const ss = getSpreadsheet();
  if (!ss) throw new Error("Chưa kết nối Spreadsheet");
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = Object.keys(payload);
    sheet.appendRow(headers);
  }
  
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  
  if (!payload.id) {
    payload.id = 'ID_' + Utilities.getUuid();
  }
  
  const row = headers.map(header => {
    let val = payload[header];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  
  sheet.appendRow(row);
  return payload;
}

function updateRow(sheetName, payload) {
  try {
    const ss = getSpreadsheet();
    if (!ss) return null;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || !payload.id) return null;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    if (idIndex === -1) return null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(payload.id)) {
        headers.forEach((header, colIndex) => {
          if (payload.hasOwnProperty(header)) {
            let val = payload[header];
            if (val === undefined || val === null) val = "";
            if (typeof val === 'object') val = JSON.stringify(val);
            sheet.getRange(i + 1, colIndex + 1).setValue(val);
          }
        });
        return payload;
      }
    }
    return null;
  } catch (e) {
    console.error(`Error updating ${sheetName}:`, e);
    return null;
  }
}

function deleteRow(sheetName, id) {
  try {
    const ss = getSpreadsheet();
    if (!ss) return null;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || !id) return null;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    if (idIndex === -1) return null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { id: id };
      }
    }
    return null;
  } catch (e) {
    console.error(`Error deleting from ${sheetName}:`, e);
    return null;
  }
}

// Hàm chuẩn hóa response API
function response(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ----- HÀM TIỆN ÍCH -----

// Chạy hàm này 1 lần duy nhất từ Editor để tạo các bảng và cột tự động
function setupSheets() {
  const ss = getSpreadsheet();
  
  const schemas = {
    'booking': ['id', 'roomId', 'branchId', 'guestName', 'guestPhone', 'guestIdCard', 'checkIn', 'checkOut', 'status', 'deposit', 'services', 'totalPrice', 'receivedAmount', 'history', 'createdAt'],
    'Branches': ['id', 'name', 'address', 'phone', 'lat', 'lng'],
    'Rooms': ['id', 'number', 'type', 'price', 'status', 'cleanStatus', 'branchId'],
    'Employees': ['id', 'name', 'username', 'password', 'phone', 'position', 'role', 'salary', 'startDate', 'status', 'branchIds'],
    'Services': ['id', 'name', 'price', 'category', 'stock'],
    'Transactions': ['id', 'branchId', 'type', 'amount', 'category', 'date', 'description', 'paymentMethod'],
    'logs': ['id', 'roomId', 'type', 'action', 'userId', 'userName', 'timestamp', 'details'],
    'Attendance': ['id', 'employeeId', 'employeeName', 'branchId', 'timestamp', 'type', 'lat', 'lng', 'distance', 'status'],
    'Wallets': ['id', 'name', 'balance', 'type']
  };
  
  for (const [sheetName, headers] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // Ghi tiêu đề (Headers)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#e0e0e0');
    sheet.setFrozenRows(1);
    
    Logger.log(`Đã thiết lập bảng: ${sheetName}`);
  }
  
  Logger.log('Tạo Sheet thành công!');
}

/*
  Ví dụ cách gọi API từ React/Frontend:
  
  Lấy dữ liệu (GET):
  fetch('URL_WEB_APP?action=getData&sheet=Rooms').then(res => res.json()).then(console.log)
  
  Thêm mới (POST):
  fetch('URL_WEB_APP', {
     redirect: "follow",
     method: 'POST',
     body: JSON.stringify({
       action: 'create',
       sheet: 'Rooms',
       payload: { number: '101', type: 'Single', price: 500000, status: 'available' }
     })
  })
*/
