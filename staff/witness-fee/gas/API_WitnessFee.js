/**
 * ============================================================================
 * BACKEND (Google Apps Script) - ระบบเบิกค่าตอบแทนพยาน สภ. (V2 - Architecture อัปเกรด)
 * ============================================================================
 */

const CONFIG = {
  OFFICER_SHEET_ID: '11qvIqj5J1X636VToSpyt4RWkh56QvU_CHpJGHTN2QFc', 
  WITNESS_SHEET_ID: '1jEHkLyf0d0-OGjegPGP5sAX8SMKwWy9ghbsTZF3t0zw', 
  TEMPLATE_DOC_ID: '1UtUM09c5eELfAInzCY3ej7DmaBg_rhIOvnvXvSzx-ZU',  
  OUTPUT_FOLDER_ID: '1YOIce1iDz4JZVo3O6qI3PlW1ZWOTbjvZ',
  
  SHEET_NAME_WITNESS: 'เบิกค่าตอบแทนพยาน',
  SHEET_NAME_OFFICER: 'ข้อมูลเจ้าหน้าที่'
};

function doGet(e) { 
  return HtmlService.createHtmlOutput("Witness Backend is Running (V2)"); 
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // รอคิวสูงสุด 30 วินาที ป้องกันเซิร์ฟเวอร์แบนจากการยิง Request ชนกัน
    lock.waitLock(30000); 
    
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    if (action === 'getData') return getData(params);
    if (action === 'getOptions') return getOptions();
    if (action === 'saveData') return saveData(params);
    if (action === 'deleteData') return deleteData(params);
    
    return responseJSON({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 1. ดึงข้อมูลตาราง (โหลดทีละ 10 แถว)
 */
function getData(params) {
  const ss = SpreadsheetApp.openById(CONFIG.WITNESS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_WITNESS);
  
  const lastRow = sheet.getLastRow();
  // ถ้ามีแค่หัวตาราง (บรรทัด 1) ให้ส่งค่าว่างกลับไป
  if (lastRow < 2) return responseJSON({ data: [], total: 0, page: 1 });

  // ดึงข้อมูลเฉพาะบรรทัดที่มีข้อมูลจริงๆ
  const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
  const reversedData = [...allData].reverse();
  
  const page = params.page || 1;
  const limit = 10; // โหลดทีละ 10 รายการตามที่ต้องการ
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const slicedData = reversedData.slice(startIndex, endIndex).map((row, index) => {
    const realRowIndex = (allData.length - (startIndex + index)) + 1; // +1 เพราะข้อมูลเริ่มบรรทัด 2
    
    // จัดกลุ่มข้อมูลให้หน้าบ้านเอาไปใช้ง่ายๆ
    const rawDataObj = {
      caseType: row[0], caseNo: row[1], accuser: row[2], suspect: row[3], investigator: row[4],
      witnessDate: row[5], dailyNo: row[6], time: row[7], witnessType: row[8], titleName: row[9],
      firstName: row[10], lastName: row[11], idCard: row[12], zone: row[13], address: row[14], phone: row[15],
      docUrl: row[16], id: row[17]
    };

    return {
      rowIndex: realRowIndex,
      display: {
        date: formatThaiDate(row[5]),
        caseType: row[0],
        caseNo: row[1],
        witnessName: `${row[9]}${row[10]} ${row[11]}`,
        suspect: row[3],
        investigator: row[4],
        docUrl: row[16]
      },
      rawData: rawDataObj
    };
  });

  return responseJSON({ data: slicedData, total: allData.length, page: page });
}

/**
 * 2. ดึงข้อมูลตัวเลือก (Dropdown & Autocomplete)
 */
function getOptions() {
  // 2.1 ดึงรายชื่อพนักงานสอบสวน
  const ssOfficer = SpreadsheetApp.openById(CONFIG.OFFICER_SHEET_ID);
  const sheetOfficer = ssOfficer.getSheetByName(CONFIG.SHEET_NAME_OFFICER);
  const lastRowOff = sheetOfficer.getLastRow();
  let officers = [];
  if (lastRowOff >= 2) {
    const offData = sheetOfficer.getRange(2, 1, lastRowOff - 1, 10).getValues();
    officers = offData.filter(r => r[8] === 'พนักงานสอบสวน').map(r => r[4]);
  }

  // 2.2 ดึงรายชื่อผู้กล่าวหาและผู้ต้องหาที่ไม่ซ้ำกัน (สำหรับ Autocomplete)
  const ssWitness = SpreadsheetApp.openById(CONFIG.WITNESS_SHEET_ID);
  const sheetWitness = ssWitness.getSheetByName(CONFIG.SHEET_NAME_WITNESS);
  const lastRowWit = sheetWitness.getLastRow();
  let accusers = [];
  let suspects = [];

  if (lastRowWit >= 2) {
    const witData = sheetWitness.getRange(2, 3, lastRowWit - 1, 2).getValues(); // ดึงคอลัมน์ C, D
    const accSet = new Set();
    const susSet = new Set();
    witData.forEach(row => {
      if (row[0]) accSet.add(row[0]);
      if (row[1]) susSet.add(row[1]);
    });
    accusers = Array.from(accSet);
    suspects = Array.from(susSet);
  }

  return responseJSON({ officers, accusers, suspects });
}

/**
 * 3. บันทึกข้อมูล (เพิ่มใหม่ / แก้ไข)
 */
function saveData(params) {
  const ss = SpreadsheetApp.openById(CONFIG.WITNESS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_WITNESS);
  
  const formData = params.formData;
  const mode = params.mode; // 'add' หรือ 'edit'
  const rowIndex = params.rowIndex;
  
  // สร้าง Placeholders จากหลังบ้านเลย (ปลอดภัยและเร็วกว่า)
  const placeholders = buildPlaceholders(formData);
  
  let docUrl = "";
  let oldDocUrl = "";

  if (mode === 'edit') {
    oldDocUrl = sheet.getRange(rowIndex, 17).getValue(); // คอลัมน์ Q (17) คือ File_URL
    if (oldDocUrl) deleteFileByUrl(oldDocUrl); // ลบไฟล์เก่าทิ้ง
  }

  // สร้างไฟล์ใหม่เสมอเมื่อมีการบันทึก
  docUrl = createDocument(placeholders, formData);
  
  // เตรียมข้อมูลลงชีต 18 คอลัมน์
  const id = mode === 'add' ? new Date().getTime().toString() : sheet.getRange(rowIndex, 18).getValue();
  
  const rowData = [
    formData.caseType, formData.caseNo, formData.accuser, formData.suspect, formData.investigator,
    formData.witnessDate, formData.dailyNo, formData.time, formData.witnessType, formData.titleName,
    formData.firstName, formData.lastName, formData.idCard, formData.zone, formData.address, formData.phone,
    docUrl, id
  ];
  
  if (mode === 'add') {
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(rowIndex, 1, 1, 18).setValues([rowData]);
  }
  
  return responseJSON({ status: 'success' });
}

/**
 * 4. ลบข้อมูล
 */
function deleteData(params) {
  const ss = SpreadsheetApp.openById(CONFIG.WITNESS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_WITNESS);
  const rowIndex = params.rowIndex;
  
  if (rowIndex <= 1) return responseJSON({ status: 'error', message: 'Cannot delete header' });

  const fileUrl = sheet.getRange(rowIndex, 17).getValue();
  if (fileUrl) deleteFileByUrl(fileUrl);
  
  sheet.deleteRow(rowIndex);
  return responseJSON({ status: 'success' });
}

/**
 * ============================================================================
 * Helper Functions (ฟังก์ชันช่วยเหลือ)
 * ============================================================================
 */

function buildPlaceholders(data) {
  const p = {};
  p['<<ประเภทคดี>>'] = data.caseType;
  p['<<เลขคดี>>'] = data.caseNo;
  p['<<ชื่อผู้กล่าวหา>>'] = data.accuser;
  p['<<ชื่อผู้ต้องหา>>'] = data.suspect;
  p['<<วันที่ไทย>>'] = formatThaiDate(data.witnessDate);
  p['<<ประจำวันข้อ>>'] = data.dailyNo;
  p['<<เวลา>>'] = data.time;
  p['<<คำนำหน้า>>'] = data.titleName;
  p['<<ชื่อสกุลพยาน>>'] = `${data.firstName} ${data.lastName}`;
  p['<<เลขประจำตัวประชาชน>>'] = data.idCard;
  p['<<ที่อยู่พยาน>>'] = data.address;
  
  const isInZone = data.zone === 'ในเขตจังหวัด';
  p['<<ใน>>'] = isInZone ? '(✓)' : '(   )';
  p['<<นอก>>'] = isInZone ? '(   )' : '(✓)';
  p['<<ค่าตอบแทน>>'] = isInZone ? '300' : '600';
  p['<<ตัวหนังสือค่าตอบแทน>>'] = isInZone ? 'สามร้อยบาทถ้วน' : 'หกร้อยบาทถ้วน';
  
  // ดึงข้อมูลเจ้าหน้าที่มาประกอบ
  const ssOfficer = SpreadsheetApp.openById(CONFIG.OFFICER_SHEET_ID);
  const sheetOfficer = ssOfficer.getSheetByName(CONFIG.SHEET_NAME_OFFICER);
  const offData = sheetOfficer.getDataRange().getValues();
  
  const inv = offData.find(o => o[4] === data.investigator) || [];
  p['<<ยศ พงส>>'] = inv[0] || '';
  p['<<ชื่อสกุล พงส>>'] = `${inv[2] || ''} ${inv[3] || ''}`.trim();
  p['<<ตำแหน่ง พงส>>'] = inv[6] || '';
  
  const headInv = offData.find(o => o[9] === 'หัวหน้างานสอบสวน') || [];
  p['<<ยศหัวหน้างาน>>'] = headInv[0] || '';
  p['<<ชื่อสกุลหัวหน้างาน>>'] = `${headInv[2] || ''} ${headInv[3] || ''}`.trim();
  p['<<ตำแหน่งหัวหน้างาน>>'] = headInv[6] || '';
  
  const headAdmin = offData.find(o => o[9] === 'หัวหน้างานอำนวยการ') || [];
  p['<<ยศผู้ตรวจสอบ>>'] = headAdmin[0] || '';
  p['<<ชื่อสกุลผู้ตรวจสอบ>>'] = `${headAdmin[2] || ''} ${headAdmin[3] || ''}`.trim();
  p['<<ตำแหน่งผู้ตรวจสอบ>>'] = headAdmin[6] || '';
  
  const chief = offData.find(o => o[9] === 'หัวหน้าสถานี') || [];
  p['<<ยศผู้อนุมัติ>>'] = chief[0] || '';
  p['<<ชื่อสกุลผู้อนุมัติ>>'] = `${chief[2] || ''} ${chief[3] || ''}`.trim();
  p['<<ตำแหน่งผู้อนุมัติ>>'] = chief[6] || '';
  
  const finance = offData.find(o => o[9] === 'เจ้าหน้าที่การเงิน') || [];
  p['<<ยศผู้จ่ายเงิน>>'] = finance[0] || '';
  p['<<ชื่อสกุลผู้จ่ายเงิน>>'] = `${finance[2] || ''} ${finance[3] || ''}`.trim();
  
  return p;
}

function createDocument(placeholders, data) {
  const templateFile = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
  const folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  
  const fileName = `${placeholders['<<ชื่อสกุลพยาน>>']} ${placeholders['<<ประเภทคดี>>']} ${placeholders['<<เลขคดี>>']}`;
  const newFile = templateFile.makeCopy(fileName, folder);
  newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const doc = DocumentApp.openById(newFile.getId());
  const body = doc.getBody();
  
  for (const key in placeholders) {
    body.replaceText(key, placeholders[key]);
  }
  
  body.editAsText().setForegroundColor('#000000');
  doc.saveAndClose();
  
  return newFile.getUrl();
}

function deleteFileByUrl(url) {
  if (!url) return;
  try {
    const match = url.match(/[-\w]{25,}/);
    if (match && match[0]) {
      DriveApp.getFileById(match[0]).setTrashed(true);
    }
  } catch (e) {
    console.error('Delete file error:', e);
  }
}

function formatThaiDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}