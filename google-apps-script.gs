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

const SPREADSHEET_ID = '1ZGhTotKKVTlD4BDx3yEsM5CzbvGo9mjaBbfG7q-1Dlc'; // ID của Google Sheet bạn vừa gửi

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet;
    
    if (action === 'getAllData') {
      // Trả về toàn bộ dữ liệu của tất cả các bảng (cẩn thận với dữ liệu lớn)
      const data = {
        booking: getSheetData('booking'),
        Branches: getSheetData('Branches'),
        Rooms: getSheetData('Rooms'),
        Employees: getSheetData('Employees'),
        Services: getSheetData('Services'),
        Transactions: getSheetData('Transactions'),
        user: getSheetData('user'),
        logs: getSheetData('logs')
      };
      return response({ success: true, data: data });
    } else if (action === 'getData' && sheetName) {
      // Lấy dữ liệu của 1 bảng cụ thể
      return response({ success: true, data: getSheetData(sheetName) });
    }
    
    return response({ error: "Tham số không hợp lệ" }, 400);
  } catch (error) {
    return response({ error: error.toString() }, 500);
  }
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return response({ error: "Không có dữ liệu POST" }, 400);
    }
    
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const sheetName = requestData.sheet;
    const payload = requestData.payload;
    
    if (!sheetName || !payload) {
      return response({ error: "Thiếu sheetName hoặc payload" }, 400);
    }

    if (action === 'create') {
      const result = appendRow(sheetName, payload);
      return response({ success: true, data: result });
    } else if (action === 'update') {
      const result = updateRow(sheetName, payload);
      return response({ success: true, data: result });
    } else if (action === 'delete') {
      const result = deleteRow(sheetName, payload.id);
      return response({ success: true, data: result });
    }
    
    return response({ error: "Hành động không hợp lệ" }, 400);
  } catch (error) {
    return response({ error: error.toString() }, 500);
  }
}

// ----- CÁC HÀM XỬ LÝ LÕI -----

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy bảng ${sheetName}`);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      // Cố gắng parse lại JSON nếu giá trị là mảng/object được lưu dưới dạng chuỗi
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch (e) {
          // Bỏ qua lỗi parse, giữ nguyên chuỗi
        }
      }
      obj[header] = val;
    });
    return obj;
  });
}

function appendRow(sheetName, payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy bảng ${sheetName}`);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Tự động sinh ID nếu chưa có
  if (!payload.id) {
    payload.id = Utilities.getUuid();
  }
  
  const row = headers.map(header => {
    let val = payload[header];
    if (typeof val === 'object' && val !== null) {
      val = JSON.stringify(val);
    }
    return val !== undefined ? val : '';
  });
  
  sheet.appendRow(row);
  return payload;
}

function updateRow(sheetName, payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy bảng ${sheetName}`);
  if (!payload.id) throw new Error('Cần có ID để cập nhật');
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) throw new Error('Bảng không có cột ID');
  
  for (let i = 1; i < data.length; i++) {
    // So sánh ID dạng chuỗi
    if (String(data[i][idIndex]) === String(payload.id)) {
      const rowToUpdate = i + 1;
      
      headers.forEach((header, colIndex) => {
        if (payload.hasOwnProperty(header)) {
          let val = payload[header];
          if (typeof val === 'object' && val !== null) {
             val = JSON.stringify(val);
          }
          sheet.getRange(rowToUpdate, colIndex + 1).setValue(val);
        }
      });
      return payload;
    }
  }
  throw new Error(`Không tìm thấy bản ghi có id ${payload.id}`);
}

function deleteRow(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy bảng ${sheetName}`);
  if (!id) throw new Error('Cần có ID để xóa');
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  throw new Error(`Không tìm thấy bản ghi có id ${id} để xóa`);
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const schemas = {
    'booking': ['id', 'roomId', 'branchId', 'guestName', 'guestPhone', 'guestIdCard', 'checkIn', 'checkOut', 'status', 'deposit', 'services', 'totalPrice', 'receivedAmount', 'history', 'createdAt'],
    'Branches': ['id', 'name', 'address'],
    'Rooms': ['id', 'number', 'type', 'price', 'status', 'cleanStatus', 'branchId'],
    'Employees': ['id', 'name', 'username', 'password', 'phone', 'position', 'salary', 'startDate', 'status', 'branchIds'],
    'Services': ['id', 'name', 'price', 'category', 'stock'],
    'Transactions': ['id', 'branchId', 'type', 'amount', 'category', 'date', 'description', 'paymentMethod'],
    'user': ['id', 'username', 'name', 'phone', 'role', 'position', 'branchIds'],
    'logs': ['id', 'roomId', 'type', 'action', 'userId', 'userName', 'timestamp']
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
