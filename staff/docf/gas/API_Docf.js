// ==========================================
// --- การตั้งค่า ID และ โฟลเดอร์ต้นแบบ ---
// ==========================================
const TEMPLATE_DOC_1 = '1GekoSULmr67LS_xTbLmCFI1LIVEfCxNAscOfJLt_ec8'; // Template ปัสสาวะ
const TEMPLATE_DOC_2 = '1VuPzDy7SW_kS4traY3yQfBNicKNLNCVxzsjEKxfV9m0'; // Template ยาเสพติด

const FOLDER_1 = '1Jii0sc19MOlvVrMwjb5RCue89PG3rMOW'; // โฟลเดอร์เซฟเอกสารแบบที่ 1
const FOLDER_2 = '1jrq18_Ll1rJS7Qug66-Qch6W5WArufug'; // โฟลเดอร์เซฟเอกสารแบบที่ 2

const MASTER_SHEET_ID = '11qvIqj5J1X636VToSpyt4RWkh56QvU_CHpJGHTN2QFc'; // ID ชีต Master Data

// ==========================================
// --- เมนูและ Setup หัวตาราง ---
// ==========================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚖️ ระบบคดียาเสพติด')
    .addItem('⚙️ ตั้งค่าหัวตาราง (Setup)', 'setupSheet')
    .addToUi();
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Database');
  if (!sheet) sheet = ss.insertSheet('Database');
  
  const headers = [
    "Timestamp", "เลขคดี", "ชื่อผู้ต้องหา", "เลขบัตร ปชช.", "อายุ",
    "วันที่เกิดเหตุ", "เวลาเกิดเหตุ", "สถานที่เกิดเหตุ", "หมู่ที่", "ตำบล", 
    "อำเภอ", "จังหวัด", "วันที่ตรวจปัสสาวะ", "เวลาตรวจปัสสาวะ", "จำนวนยาเสพติด", "สถานที่พบยา",
    "ยึดทรัพย์ที่", "ข้อกล่าวหา", "พฤติการณ์", "ผู้กล่าวหา", "ตำแหน่งผู้กล่าวหา",
    "พนักงานสอบสวน", "ตำแหน่ง พงส.", "เบอร์โทร พงส.", "ผู้ช่วย พงส.", 
    "สถานะ", "ลิงก์เอกสาร1", "ลิงก์เอกสาร2"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  sheet.setFrozenRows(1);
}

// ==========================================
// --- ฟังก์ชันดึงข้อมูลคดี (Helper สำหรับ GET และ POST) ---
// ==========================================
function fetchAllCases() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Database');
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    result.push({
      rowIndex: i + 1, 
      caseNo: data[i][1], 
      suspectName: data[i][2], 
      incidentDate: data[i][5],
      charge: data[i][17],        
      officer: data[i][21],       
      docLink1: data[i][26],      
      docLink2: data[i][27],      
      accuser: data[i][19],       
      accuserPos: data[i][20],    
      assistantOfficer: data[i][24], 
      fullData: data[i] 
    });
  }
  return result.reverse();
}

// ==========================================
// --- ฟังก์ชันดึง Master Data (Helper สำหรับ GET และ POST) ---
// ==========================================
function fetchMasterData() {
  const ssMaster = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const sheetStation = ssMaster.getSheetByName('ข้อมูลสถานีตำรวจ');
  let stationData = {};
  if (sheetStation) {
    const vals = sheetStation.getDataRange().getDisplayValues();
    vals.forEach(row => {
      if (row[0]) stationData[row[0].trim()] = (row[1] || "").trim();
    });
  }
  
  const sheetOfficer = ssMaster.getSheetByName('ข้อมูลเจ้าหน้าที่');
  let officerData = [];
  if (sheetOfficer) {
    const vals = sheetOfficer.getDataRange().getDisplayValues();
    const headers = vals[0];
    for (let i = 1; i < vals.length; i++) {
      let obj = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = vals[i][idx] ? vals[i][idx].trim() : "";
      });
      officerData.push(obj);
    }
  }
  return { station: stationData, officers: officerData };
}

// ==========================================
// --- GET API (สำรองไว้รองรับทั้ง GET) ---
// ==========================================
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    if (e.parameter.action === 'getData') {
      try {
        return responseJSON(fetchAllCases());
      } catch (err) {
        return responseJSON([]);
      }
    }
    
    if (e.parameter.action === 'getMasterData') {
      try {
        return responseJSON(fetchMasterData());
      } catch (err) {
        return responseJSON({ error: err.toString() });
      }
    }
  }
  
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบบันทึกคดียาเสพติด')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// --- POST API (ดึงข้อมูล / บันทึก / แก้ไข / ลบ / สร้างเอกสาร) ---
// ==========================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Database');
    const action = data.action || 'create';

    // --- 1. ดึงข้อมูลตารางผ่านคำขอ POST ---
    if (action === 'getData') {
      return responseJSON(fetchAllCases());
    }

    // --- 2. ดึงข้อมูล Master Data ผ่านคำขอ POST ---
    if (action === 'getMasterData') {
      return responseJSON(fetchMasterData());
    }

    // --- 3. ลบข้อมูลคดี ---
    if (action === 'delete') {
      sheet.deleteRow(data.rowIndex);
      return responseJSON({ status: 'success', message: 'ลบข้อมูลสำเร็จ' });
    }

    // --- 4. สร้างเอกสาร Word/Doc อัตโนมัติ ---
    if (action === 'generateDoc') {
      const row = data.rowIndex;
      const docType = data.docType; 
      const templateId = docType === 1 ? TEMPLATE_DOC_1 : TEMPLATE_DOC_2;
      const folderId = docType === 1 ? FOLDER_1 : FOLDER_2;
      const colToUpdate = docType === 1 ? 27 : 28; 

      const rowValues = sheet.getRange(row, 1, 1, 26).getDisplayValues()[0];

      let stationData = {};
      try {
        const ssMaster = SpreadsheetApp.openById(MASTER_SHEET_ID);
        const sheetStation = ssMaster.getSheetByName('ข้อมูลสถานีตำรวจ');
        if (sheetStation) {
          const vals = sheetStation.getDataRange().getDisplayValues();
          vals.forEach(r => { if (r[0]) stationData[r[0].trim()] = (r[1] || "").trim(); });
        }
      } catch(e) {}

      const folder = DriveApp.getFolderById(folderId);
      const template = DriveApp.getFileById(templateId);
      const newFile = template.makeCopy(`เอกสารคดี_${data.caseNo}_แบบที่${docType}`, folder);
      const doc = DocumentApp.openById(newFile.getId());
      const body = doc.getBody();

      // ฟังก์ชันดักจับ "ยศ" และ "ชื่อ" จากฐานข้อมูลยศตำรวจโดยตรง (Regex)
      const splitRankAndName = (text) => {
        if (!text || text === "-") return { rank: "", name: "" };
        
        const rankRegex = /^(ว่าที่\s*)?(พล\.ต\.อ\.|พล\.ต\.ท\.|พล\.ต\.ต\.|พ\.ต\.อ\.|พ\.ต\.ท\.|พ\.ต\.ต\.|ร\.ต\.อ\.|ร\.ต\.ท\.|ร\.ต\.ต\.|ด\.ต\.|จ\.ส\.ต\.|ส\.ต\.อ\.|ส\.ต\.ท\.|ส\.ต\.ต\.|นาย|นางสาว|นาง)(หญิง)?\s*/;
        const match = text.match(rankRegex);
        
        if (match) {
          const rank = match[0].trim();
          const name = text.replace(match[0], "").trim();
          return { rank: rank, name: name };
        }
        
        const parts = text.trim().split(/\s+/);
        if (parts.length > 1 && parts[0].includes(".")) {
          return { rank: parts[0], name: parts.slice(1).join(" ") };
        }
        
        return { rank: "", name: text };
      };

      const accuserObj = splitRankAndName(rowValues[19]);
      const officerObj = splitRankAndName(rowValues[21]);

      // แทนที่ข้อมูลคดีลงใน Template
      safeReplace(body, '{{เลขคดี}}', rowValues[1]);
      safeReplace(body, '{{ชื่อผู้ต้องหา}}', rowValues[2]);
      safeReplace(body, '{{เลขบัตรประชาชน}}', rowValues[3]);
      safeReplace(body, '{{อายุ}}', rowValues[4]);
      safeReplace(body, '{{วันที่เกิดเหตุ}}', rowValues[5]);
      safeReplace(body, '{{เวลาเกิดเหตุ}}', rowValues[6]);
      safeReplace(body, '{{สถานที่เกิดเหตุ}}', rowValues[7]);
      safeReplace(body, '{{หมู่ที่}}', rowValues[8]);
      safeReplace(body, '{{ตำบล}}', rowValues[9]);
      safeReplace(body, '{{อำเภอ}}', rowValues[10]);
      safeReplace(body, '{{จังหวัด}}', rowValues[11]);
      safeReplace(body, '{{วันที่ตรวจปัสสาวะ}}', rowValues[12]);
      safeReplace(body, '{{เวลาตรวจปัสสาวะ}}', rowValues[13]);
      safeReplace(body, '{{จำนวนยาเสพติด}}', rowValues[14]);
      safeReplace(body, '{{สถานที่พบยา}}', rowValues[15]);
      safeReplace(body, '{{ยึดทรัพย์ที่}}', rowValues[16]);
      safeReplace(body, '{{ข้อกล่าวหา}}', rowValues[17]);
      safeReplace(body, '{{พฤติการณ์}}', rowValues[18]);
      safeReplace(body, '{{ตำแหน่งผู้กล่าวหา}}', rowValues[20]);
      safeReplace(body, '{{ตำแหน่งพงส}}', rowValues[22]);
      safeReplace(body, '{{เบอร์โทรพงส}}', rowValues[23]);
      safeReplace(body, '{{ผู้ช่วยพงส}}', rowValues[24]);

      // แทนที่ "ผู้กล่าวหา" (แยกยศและชื่อ)
      safeReplace(body, '{{ผู้กล่าวหา}}', rowValues[19]);
      safeReplace(body, '{{ยศผู้กล่าวหา}}', accuserObj.rank);
      safeReplace(body, '{{ชื่อผู้กล่าวหา}}', accuserObj.name);

      // แทนที่ "พนักงานสอบสวน" (แยกยศและชื่อ)
      safeReplace(body, '{{พนักงานสอบสวน}}', rowValues[21]);
      safeReplace(body, '{{ยศพงส}}', officerObj.rank);
      safeReplace(body, '{{ชื่อพงส}}', officerObj.name);

      for (let key in stationData) {
        safeReplace(body, `{{${key}}}`, stationData[key]);
      }

      convertArabicToThaiNumerals(doc);
      doc.saveAndClose(); 

      const docUrl = newFile.getUrl();
      sheet.getRange(row, colToUpdate).setValue(docUrl); 
      return responseJSON({ status: 'success', url: docUrl });
    }

    // --- 5. เพิ่ม หรือ แก้ไขข้อมูลคดี ---
    const timestamp = new Date();
    const fullName = (data.suspectPrefix || "") + (data.suspectName || "-");
    
    const finalAccuser = (data.accuserTitle && data.accuserName) 
      ? (data.accuserTitle.trim() + " " + data.accuserName.trim()) 
      : (data.accuser || "-");

    const finalOfficer = (data.officerTitle && data.officerName) 
      ? (data.officerTitle.trim() + " " + data.officerName.trim()) 
      : (data.officer || "-");
    
    const formatText = (val) => val ? "'" + val.trim() : "-";

    const rowData = [
      timestamp, 
      formatText(data.caseNo),
      fullName, 
      formatText(data.suspectIdCard),
      data.suspectAge || "-",
      data.incidentDate || "-", 
      formatText(data.incidentTime),
      data.incidentPlace || "-", 
      formatText(data.moo),
      data.subdistrict || "-",
      data.amphoe || "-", 
      data.province || "-", 
      data.urineDate || "-", 
      formatText(data.urineTime),
      (data.drugAmount || "0") + " " + (data.drugUnit || ""), 
      data.drugFoundPlace || "-", 
      data.assetSeizedAt || "-",
      data.chargesText || "-", 
      data.behaviorText || "-", 
      finalAccuser, 
      data.accuserPos || "-",
      finalOfficer, 
      data.officerRank || "-", 
      formatText(data.officerPhone),
      data.assistantOfficer || "-",
      "บันทึกแล้ว"
    ];

    if (action === 'update') {
      sheet.getRange(data.rowIndex, 1, 1, 26).setValues([rowData]);
      sheet.getRange(data.rowIndex, 27, 1, 2).setValues([["", ""]]);
      return responseJSON({ status: 'success', message: 'แก้ไขข้อมูลสำเร็จ' });
    } else {
      rowData.push("-", "-"); 
      sheet.appendRow(rowData);
      return responseJSON({ status: 'success', message: 'บันทึกข้อมูลสำเร็จ' });
    }
      
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

// ==========================================
// --- ฟังก์ชันช่วยเหลือ (Helper Functions) ---
// ==========================================
function safeReplace(body, searchTag, val) {
  var textVal = (val !== undefined && val !== null) ? String(val) : '';
  textVal = textVal.replace(/\$/g, '$$$$'); 
  body.replaceText(searchTag, textVal);
}

function convertArabicToThaiNumerals(doc) {
  const arabicDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const thaiDigits   = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

  const body = doc.getBody();
  if (body) {
    for (let i = 0; i < 10; i++) {
      body.replaceText(arabicDigits[i], thaiDigits[i]);
    }
  }
  const header = doc.getHeader();
  if (header) {
    for (let i = 0; i < 10; i++) {
      header.replaceText(arabicDigits[i], thaiDigits[i]);
    }
  }
  const footer = doc.getFooter();
  if (footer) {
    for (let i = 0; i < 10; i++) {
      footer.replaceText(arabicDigits[i], thaiDigits[i]);
    }
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}