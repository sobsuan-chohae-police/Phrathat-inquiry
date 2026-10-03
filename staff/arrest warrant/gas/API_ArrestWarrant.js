// ==========================================
// ตั้งค่าตัวแปรพื้นฐาน
// ==========================================
const SHEET_NAME = "Data"; 

// --- ID เทมเพลตเอกสาร ---
const TEMPLATE_ID = "16ydhcfvZbtm7tAYS6GQ1aRsSLx0oqCb1OBceRBbIg20"; // เทมเพลตเดิมส่งหมาย
const TEMPLATE_ID_SUSPEND_1 = "1T0GyJd2pVKBoIHhc1kCJBOyFKKjzZ2yGKgHM9YHbqVk"; // เทมเพลตงดสืบจับ ชุดที่ 1
const TEMPLATE_ID_SUSPEND_2 = "1p24t7cn1N7IRMLPlWqcXriemTbkRL36mlryfy_MvXD0"; // เทมเพลตงดสืบจับ ชุดที่ 2

// --- ID โฟลเดอร์แยกตามประเภทเอกสาร ---
const FOLDER_ID_WARRANT = "1HQn811pYxSqDfDealWAfbH2ncvSoPCgB";   // *** ใส่ Folder ID เอกสารส่งหมายจับ ***
const FOLDER_ID_SUSPEND_1 = "1w7h25ixyeTnOoHmF-q2PXaelE9m8Z_XY"; // *** ใส่ Folder ID งดสืบจับ ชุดที่ 1 ***
const FOLDER_ID_SUSPEND_2 = "1xcjvIv8DAX61Gy0MtF7LiY03MMnKidIe"; // *** ใส่ Folder ID งดสืบจับ ชุดที่ 2 ***

// ==========================================
// ฟังก์ชันช่วยเหลือ (Helper Functions)
// ==========================================

function safeStr(text) {
  return text ? "'" + text : "";
}

// ฟังก์ชันแปลงเลขไทย
function toThaiNum(text) {
  if (!text) return "-";
  text = text.toString();
  const thaiNums = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
  return text.replace(/[0-9]/g, match => thaiNums[match]);
}

// ฟังก์ชันสำหรับแทนที่คำในเอกสาร (ดึงข้อมูลเดิมจากตาราง + ข้อมูลที่กรอกเพิ่ม)
function fillDocBody(body, rowData, extraData) {
  // 1. ดึงข้อมูลเดิมจาก Google Sheets (คำเดียวกับเอกสารส่งหมายจับ)
  body.replaceText("<<caseNo>>", toThaiNum(rowData[1]));
  body.replaceText("<<warrantNo>>", toThaiNum(rowData[2]));
  body.replaceText("<<warrantDate>>", toThaiNum(rowData[3]));
  body.replaceText("<<charge>>", toThaiNum(rowData[4]));
  body.replaceText("<<court>>", toThaiNum(rowData[5]));
  body.replaceText("<<suspectName>>", toThaiNum(rowData[6]));
  body.replaceText("<<suspectAge>>", toThaiNum(rowData[7]));
  body.replaceText("<<suspectIdCard>>", toThaiNum(rowData[8]));
  body.replaceText("<<address>>", toThaiNum(rowData[9]));
  body.replaceText("<<moo>>", toThaiNum(rowData[10]));
  body.replaceText("<<subdistrict>>", toThaiNum(rowData[11]));
  body.replaceText("<<district>>", toThaiNum(rowData[12]));
  body.replaceText("<<province>>", toThaiNum(rowData[13]));
  body.replaceText("<<sendDate>>", toThaiNum(rowData[14]));
  body.replaceText("<<sendTo>>", toThaiNum(rowData[15]));
  body.replaceText("<<docCount>>", toThaiNum(rowData[16]));

  // 2. ถ้ามีข้อมูลเพิ่มเติม (กรณีเอกสารงดสืบจับ) ให้แทนที่เพิ่มลงไป
  if (extraData) {
    body.replaceText("<<bookNo1>>", toThaiNum(extraData.bookNo1));     
    body.replaceText("<<bookNo2>>", toThaiNum(extraData.bookNo2));     
    body.replaceText("<<dailyReportNo>>", toThaiNum(extraData.dailyReportNo)); 
    body.replaceText("<<dailyReportDate>>", toThaiNum(extraData.dailyReportDate)); 
    body.replaceText("<<suspendDate>>", toThaiNum(extraData.suspendDate)); 
    body.replaceText("<<suspendReason>>", toThaiNum(extraData.suspendReason)); 
  }
}

// ==========================================
// [สำหรับกดรันเอง] ฟังก์ชันทดสอบสร้างหัวตาราง
// ==========================================
function manualSetup() {
  const sheet = setupSheet();
  Logger.log("สร้างหัวตารางเรียบร้อยแล้วในชีต: " + sheet.getName());
}

// ==========================================
// 1. ฟังก์ชันสร้างหัวตารางอัตโนมัติ
// ==========================================
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("ไม่พบไฟล์ Google Sheets กรุณาเปิดสคริปต์นี้จากเมนู 'ส่วนขยาย' > 'Apps Script' ในไฟล์ Google Sheets เท่านั้น");
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) { 
    sheet = ss.insertSheet(SHEET_NAME); 
  }
  
  const a1Value = sheet.getRange("A1").getValue().toString().trim();
  if (a1Value !== "Timestamp") {
    const headers = [
      "Timestamp", "คดีอาญาที่", "หมายจับที่", "ลงวันที่ (หมายจับ)", 
      "ข้อกล่าวหา", "ศาลจังหวัด", "ชื่อ-สกุล ผู้ต้องหา", "อายุ", 
      "เลขบัตร ปชช.", "ที่อยู่", "หมู่", "ตำบล", "อำเภอ", "จังหวัด", 
      "วันที่หนังสือส่ง", "ส่งไปยัง", "จำนวนเอกสาร", "ลิงก์เอกสารส่งหมาย", 
      "ลิงก์เอกสารงดสืบจับ 1", "ลิงก์เอกสารงดสืบจับ 2"
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  
  return sheet;
}

// ==========================================
// 2. ฟังก์ชันรับ GET Request
// ==========================================
function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("API ทำงานปกติ กรุณาเรียกใช้งานผ่าน Web App URL");
  }
  const action = e.parameter.action;
  if (action === 'getData') {
    return createResponse(getData());
  }
  return createResponse({ status: 'error', message: 'Invalid action' });
}

// ==========================================
// 3. ฟังก์ชันรับ POST Request
// ==========================================
function doPost(e) {
  try {
    let sheet = setupSheet();

    if (!e || !e.postData) {
      return createResponse({ status: 'error', message: 'กรุณาใช้งานผ่าน Web App หรือเลือกฟังก์ชัน manualSetup เพื่อทดสอบ' });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // ✨ รองรับการดึงข้อมูลตารางผ่านคำสั่ง POST
    if (action === 'getData') {
      return createResponse(getData());
    }

    if (action === 'create') {
      const newRow = [
        new Date(), safeStr(data.caseNo), safeStr(data.warrantNo), safeStr(data.warrantDate), 
        safeStr(data.charge), safeStr(data.court), safeStr(data.suspectName), safeStr(data.suspectAge), 
        safeStr(data.suspectIdCard), safeStr(data.address), safeStr(data.moo), safeStr(data.subdistrict), 
        safeStr(data.district), safeStr(data.province), safeStr(data.sendDate), safeStr(data.sendTo), 
        safeStr(data.docCount), "", "", ""
      ];
      sheet.appendRow(newRow);
      return createResponse({ status: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    }

    if (action === 'update') {
      const rowIndex = parseInt(data.rowIndex);
      const updateData = [
        [
          safeStr(data.caseNo), safeStr(data.warrantNo), safeStr(data.warrantDate), 
          safeStr(data.charge), safeStr(data.court), safeStr(data.suspectName), safeStr(data.suspectAge), 
          safeStr(data.suspectIdCard), safeStr(data.address), safeStr(data.moo), safeStr(data.subdistrict), 
          safeStr(data.district), safeStr(data.province), safeStr(data.sendDate), safeStr(data.sendTo), 
          safeStr(data.docCount)
        ]
      ];
      sheet.getRange(rowIndex, 2, 1, 16).setValues(updateData);

      if (data.clearDocs) {
        sheet.getRange(rowIndex, 18).setValue(""); 
        sheet.getRange(rowIndex, 19).setValue(""); 
        sheet.getRange(rowIndex, 20).setValue(""); 
      }
      return createResponse({ status: 'success', message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' });
    }

    if (action === 'delete') {
      sheet.deleteRow(parseInt(data.rowIndex));
      return createResponse({ status: 'success', message: 'ลบข้อมูลเรียบร้อยแล้ว' });
    }

    // ------------------------------------
    // สร้างเอกสารส่งหมายจับ (เซฟเข้า FOLDER_ID_WARRANT)
    // ------------------------------------
    if (action === 'generateDoc') {
      const rowIndex = parseInt(data.rowIndex);
      const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
      const templateFile = DriveApp.getFileById(TEMPLATE_ID);
      const folder = DriveApp.getFolderById(FOLDER_ID_WARRANT);
      const newFileName = "เอกสารส่งหมายจับ_" + (rowData[6] || "ไม่ระบุชื่อ");
      const newFile = templateFile.makeCopy(newFileName, folder);
      const doc = DocumentApp.openById(newFile.getId());
      
      // ดึงข้อมูลกรอกลงเอกสารส่งหมายจับ
      fillDocBody(doc.getBody(), rowData);

      doc.saveAndClose();
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const docUrl = newFile.getUrl();
      sheet.getRange(rowIndex, 18).setValue(docUrl); 

      return createResponse({ status: 'success', url: docUrl });
    }

    // ------------------------------------
    // สร้างเอกสารงดสืบจับและรายงานศาล (เซฟแยกโฟลเดอร์ 1 และ 2)
    // ------------------------------------
    if (action === 'generateSuspendDoc') {
      const rowIndex = parseInt(data.rowIndex);
      const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
      
      // --- สร้างเอกสารชุดที่ 1 (เซฟเข้า FOLDER_ID_SUSPEND_1) ---
      const folder1 = DriveApp.getFolderById(FOLDER_ID_SUSPEND_1);
      const templateFile1 = DriveApp.getFileById(TEMPLATE_ID_SUSPEND_1);
      const newFile1 = templateFile1.makeCopy("งดสืบจับ_ชุดที่1_" + (rowData[6] || "ไม่ระบุชื่อ"), folder1);
      const doc1 = DocumentApp.openById(newFile1.getId());
      
      fillDocBody(doc1.getBody(), rowData, data);

      doc1.saveAndClose();
      Utilities.sleep(1000);
      newFile1.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const docUrl1 = newFile1.getUrl();

      // --- สร้างเอกสารชุดที่ 2 (เซฟเข้า FOLDER_ID_SUSPEND_2) ---
      const folder2 = DriveApp.getFolderById(FOLDER_ID_SUSPEND_2);
      const templateFile2 = DriveApp.getFileById(TEMPLATE_ID_SUSPEND_2);
      const newFile2 = templateFile2.makeCopy("งดสืบจับ_ชุดที่2_" + (rowData[6] || "ไม่ระบุชื่อ"), folder2);
      const doc2 = DocumentApp.openById(newFile2.getId());
      
      fillDocBody(doc2.getBody(), rowData, data);

      doc2.saveAndClose();
      Utilities.sleep(1000);
      newFile2.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const docUrl2 = newFile2.getUrl();

      sheet.getRange(rowIndex, 19).setValue(docUrl1); 
      sheet.getRange(rowIndex, 20).setValue(docUrl2); 

      return createResponse({ status: 'success', url1: docUrl1, url2: docUrl2 });
    }

  } catch (error) {
    return createResponse({ status: 'error', message: error.toString() });
  }
}

// ==========================================
// 4. ฟังก์ชันดึงข้อมูลทั้งหมด
// ==========================================
function getData() {
  let sheet = setupSheet(); 

  const data = sheet.getDataRange().getDisplayValues();
  const result = [];
  
  if (data.length <= 1) return result; 

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    result.push({
      rowIndex: i + 1, 
      caseNo: row[1],
      warrantNo: row[2],
      suspectName: row[6],
      docLink: row[17],         
      suspendDocLink1: row[18], 
      suspendDocLink2: row[19], 
      fullData: row
    });
  }
  return result;
}

// ==========================================
// 5. ฟังก์ชันแปลง Object เป็น JSON Response
// ==========================================
function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}