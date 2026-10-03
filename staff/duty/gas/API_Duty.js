const SHEET_ROSTER_ID = '1mIOLF5eEXnmFVosh61Rem-HOnXukW5fITY_qx3o82qo';

// ==========================================
// 1. อ่านข้อมูล (GET Request) - โหลดเร็วทะลุนรก + Cache วันหยุด
// ==========================================
function doGet(e) {
  const action = e.parameter.action;
  if (!action) return ContentService.createTextOutput("Roster API Running").setMimeType(ContentService.MimeType.TEXT);

  const ss = SpreadsheetApp.openById(SHEET_ROSTER_ID); 
  
  if (action == 'getRoster') {
    const sheet = ss.getSheetByName('ตารางเวร');
    // ใช้ getValues() เร็วกว่า getDisplayValues() มหาศาล
    const data = sheet.getDataRange().getValues(); 
    
    let startTimestamp = e.parameter.startDate ? parseDMYToTime(e.parameter.startDate) : null;
    let endTimestamp = e.parameter.endDate ? parseDMYToTime(e.parameter.endDate) : null;

    let result = [];
    if (data.length >= 2) {
      for (let i = 1; i < data.length; i++) {
        // จัดการ Format วันที่ที่ได้จาก getValues()
        let dateVal = data[i][0];
        let dateStr = "";
        
        if (Object.prototype.toString.call(dateVal) === '[object Date]') {
          dateStr = dateVal.getDate() + '/' + (dateVal.getMonth() + 1) + '/' + dateVal.getFullYear();
        } else {
          dateStr = String(dateVal).trim();
        }
        
        if (!dateStr) continue;

        let rowTimestamp = parseDMYToTime(dateStr);
        if (startTimestamp && rowTimestamp < startTimestamp) continue;
        if (endTimestamp && rowTimestamp > endTimestamp) continue;

        result.push({
          dateAD: dateStr, 
          dateTH: String(data[i][1] || ''),
          baseInv: String(data[i][2] || ''),
          baseAsst: String(data[i][3] || ''),
          baseClerk: String(data[i][4] || ''),
          swapInv: String(data[i][5] || ''),
          swapAsst: String(data[i][6] || ''),
          swapClerk: String(data[i][7] || '')
        });
      }
    }

    // ==========================================
    // ดึงวันหยุด (ใช้ CacheService เพื่อความเร็วแสง)
    // ==========================================
    let holidays = null; 
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = 'holidays_' + (startTimestamp || 'all') + '_' + (endTimestamp || 'all');
      const cachedHolidays = cache.get(cacheKey);

      if (cachedHolidays) {
        // ดึงจาก Cache (0.01 วินาที)
        holidays = JSON.parse(cachedHolidays);
      } else {
        // ดึงจาก Calendar (2-3 วินาที)
        const holidayCalId = 'th.th#holiday@group.v.calendar.google.com';
        let cal = CalendarApp.getCalendarById(holidayCalId);
        if (!cal) cal = CalendarApp.subscribeToCalendar(holidayCalId, {hidden: true});
        
        if (cal && startTimestamp && endTimestamp) {
          holidays = {}; 
          let events = cal.getEvents(new Date(startTimestamp), new Date(endTimestamp + 86400000));
          events.forEach(e => {
            let d = e.getStartTime();
            let dStr = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
            holidays[dStr] = holidays[dStr] ? holidays[dStr] + ', ' + e.getTitle() : e.getTitle();
          });
          
          // เก็บลง Cache ไว้ 6 ชั่วโมง (21600 วินาที)
          cache.put(cacheKey, JSON.stringify(holidays), 21600);
        }
      }
    } catch (err) {
      // ปล่อยผ่านถ้า Calendar มีปัญหา
    }

    return responseJSON({ data: result, holidays: holidays });
  }
}

// ==========================================
// 2. บันทึกข้อมูล (POST Request) - O(1) Time Complexity
// ==========================================
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  if (action == 'saveRoster') {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // รอคิวสูงสุด 10 วินาที
      
      const ss = SpreadsheetApp.openById(SHEET_ROSTER_ID); 
      const sheet = ss.getSheetByName('ตารางเวร');
      const dataToSave = params.data; 

      if (!dataToSave || dataToSave.length === 0) return responseJSON({ status: 'success' });

      // ตรวจสอบ Header ถ้าชีตว่างเปล่า
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['วันที่ ค.ศ.', 'วันที่ พ.ศ.', 'พนักงานสอบสวนเวร', 'ผู้ช่วยพนักงานสอบสวน', 'เสมียนประจำวัน', 'พงส. (แทน)', 'ผู้ช่วยฯ (แทน)', 'เสมียน (แทน)']);
      }

      dataToSave.forEach(item => {
        // ใช้ TextFinder ค้นหาวันที่ในคอลัมน์ A (เร็วมาก ไม่ต้องโหลดทั้งชีต)
        const textFinder = sheet.getRange("A:A").createTextFinder(item.dateAD).matchEntireCell(true);
        const cell = textFinder.findNext();

        const rowData = [
          item.dateAD, 
          item.dateTH || '',
          item.baseInv || '', 
          item.baseAsst || '', 
          item.baseClerk || '',
          item.swapInv || '', 
          item.swapAsst || '', 
          item.swapClerk || ''
        ];

        if (cell) {
          // ถ้าเจอวันที่นี้แล้ว -> อัปเดตเฉพาะแถวนั้น
          sheet.getRange(cell.getRow(), 1, 1, 8).setValues([rowData]);
        } else {
          // ถ้าไม่เจอ (วันใหม่) -> ต่อท้ายชีต
          sheet.appendRow(rowData);
        }
      });

      return responseJSON({ status: 'success' });

    } catch (error) {
      console.error("Save Error: ", error);
      return responseJSON({ status: 'error', message: 'ระบบกำลังยุ่ง กรุณาลองใหม่' });
    } finally {
      lock.releaseLock(); 
    }
  }
}

// ==========================================
// Utilities
// ==========================================
function parseDMYToTime(dmyStr) {
  if (!dmyStr || !dmyStr.includes('/')) return 0;
  let parts = dmyStr.split('/');
  let d = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10) - 1; 
  let y = parseInt(parts[2], 10);
  return new Date(y, m, d).getTime();
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}