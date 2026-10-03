const CONFIG = {
  SHEET_DRUNK_ID: '1sc362FpyGipOofR3nXVLXNTN50AvcxuxDuAoRbTicEA',
  SHEET_STATION_ID: '11qvIqj5J1X636VToSpyt4RWkh56QvU_CHpJGHTN2QFc',
  TEMPLATE_CASE_ID: '1asUwniUkErf7HHqmEPXnYjCtqX93Z10XZIbQzBfK9WY',
  TEMPLATE_BAIL_ID: '1pcCcUs4hn52sP3XftRSZnsc60jBpXdlDdWUh-C-hmAg',
  FOLDER_OUTPUT_ID: '1j-KdMfXhDCsYJKuNQdoiT-gGKtdxzx-r',
  
  SHEET_NAME_DETAIL: 'รายละเอียด',
  SHEET_NAME_LIST: 'List',
  SHEET_NAME_STATION: 'ข้อมูลสถานีตำรวจ',
  SHEET_NAME_OFFICER: 'ข้อมูลเจ้าหน้าที่'
};

function doGet(e) { return HtmlService.createHtmlOutput("Backend Running"); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    if (action === 'getData') return getData(params);
    if (action === 'getOptions') return getOptions();
    if (action === 'saveCase') return saveCase(params);
    if (action === 'deleteCase') return deleteCase(params);
    
    return responseJSON({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getData(params) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_DRUNK_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_DETAIL);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return responseJSON({ data: [], total: 0 });

  const allData = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).getDisplayValues();
  const reversedData = [...allData].reverse();
  
  const page = params.page || 1;
  const limit = 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const slicedData = reversedData.slice(startIndex, endIndex).map((row, index) => {
    const realRowIndex = (allData.length - (startIndex + index)) + 2;
    let rowObject = {};
    headers.forEach((h, i) => { rowObject[h] = row[i]; });

    return {
      rowIndex: realRowIndex,
      display: {
        linkCase: rowObject['สำนวน'],
        linkBail: rowObject['ประกันตัว'],
        suspect: rowObject['ผู้ต้องหา'],
        caseNo: rowObject['เลขคดี'],
        dateIn: rowObject['วันที่รับคดี'],
        alcohol: rowObject['แอลกอฮอล์'],
        officer: rowObject['พนักงานสอบสวน'],
        bailStatus: rowObject['การประกันตัว']
      },
      rawData: rowObject
    };
  });

  return responseJSON({ data: slicedData, total: allData.length, page: page });
}

function getOptions() {
  const ssDrunk = SpreadsheetApp.openById(CONFIG.SHEET_DRUNK_ID);
  const sheetList = ssDrunk.getSheetByName(CONFIG.SHEET_NAME_LIST);
  const ssStation = SpreadsheetApp.openById(CONFIG.SHEET_STATION_ID);
  const sheetOfficer = ssStation.getSheetByName(CONFIG.SHEET_NAME_OFFICER);
  
  const lastRowList = sheetList.getLastRow();
  let accusers = [], places = [];
  if (lastRowList >= 2) {
    const listData = sheetList.getRange(2, 1, lastRowList - 1, 2).getValues();
    accusers = listData.map(r => r[0]).filter(String);
    places = listData.map(r => r[1]).filter(String);
  }
  
  const lastRowOff = sheetOfficer.getLastRow();
  let officers = [];
  if (lastRowOff >= 2) {
    const offData = sheetOfficer.getRange(2, 1, lastRowOff - 1, 9).getValues();
    officers = offData.filter(r => r[8] === 'พนักงานสอบสวน').map(r => r[4]);
  }
  
  return responseJSON({ accusers, places, officers });
}

function saveCase(params) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_DRUNK_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_DETAIL);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const formData = params.formData;
  let newRowData = new Array(headers.length).fill("");
  
  for (const [key, value] of Object.entries(formData)) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) newRowData[colIndex] = value;
  }
  
  let targetRow;
  let oldRowDataMap = {}; 
  
  if (params.mode === 'add') {
    const lastRow = sheet.getLastRow();
    targetRow = lastRow < 2 ? 3 : lastRow + 1;
  } else {
    targetRow = params.rowIndex;
    const oldValues = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    headers.forEach((h, i) => { oldRowDataMap[h] = oldValues[i]; });

    const colIndexFileCase = headers.indexOf('File_ID_สำนวน');
    const colIndexFileBail = headers.indexOf('File_ID_ประกัน');
    const colIndexLinkCase = headers.indexOf('สำนวน');
    const colIndexLinkBail = headers.indexOf('ประกันตัว');

    if (colIndexFileCase !== -1) newRowData[colIndexFileCase] = oldValues[colIndexFileCase];
    if (colIndexFileBail !== -1) newRowData[colIndexFileBail] = oldValues[colIndexFileBail];
    if (colIndexLinkCase !== -1) newRowData[colIndexLinkCase] = oldValues[colIndexLinkCase];
    if (colIndexLinkBail !== -1) newRowData[colIndexLinkBail] = oldValues[colIndexLinkBail];
  }
  
  sheet.getRange(targetRow, 1, 1, newRowData.length).setValues([newRowData]);
  SpreadsheetApp.flush(); 
  
  const fullRowValues = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  let currentDataMap = {};
  headers.forEach((header, index) => { currentDataMap[header] = fullRowValues[index]; });
  
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_OUTPUT_ID);
  const colIndexFileCase = headers.indexOf('File_ID_สำนวน');
  const colIndexFileBail = headers.indexOf('File_ID_ประกัน');
  const colIndexLinkCase = headers.indexOf('สำนวน');
  const colIndexLinkBail = headers.indexOf('ประกันตัว');

  let caseDocId = currentDataMap['File_ID_สำนวน'];
  let caseDocUrl = currentDataMap['สำนวน'];
  let needNewCaseDoc = false;

  if (params.mode === 'add') {
    needNewCaseDoc = true;
  } else {
    const caseFieldsToCheck = [
      'คำนำชื่อ ผตห', 'ชื่อ ผตห', 'สกุล ผตห', 'เลขประจำตัว ผตห', 'อายุ ผตห', 'โทรศัพท์ ผตห',
      'ที่อยู่ผู้ต้องหา', 'เกิดตำบล', 'เกิดอำเภอ', 'เกิดจังหวัด', 'อาชีพ ผตห', 'การศึกษา',
      'ชื่อบิดา', 'ชื่อมารดา', 'เลขคดี', 'วันที่รับคดี', 'เวลารับคดี', 'ปจว ข้อ', 'ผู้กล่าวหา', 'สถานที่เกิดเหตุ',
      'เขตเทศบาล', 'วันที่เกิดเหตุ', 'เวลาเกิดเหตุ', 'รถที่ขับ', 'แอลกอฮอล์',
      'การกระทำผิดพินัย', 'วันที่ส่งฟ้อง', 'ผู้สั่งคดี', 'พนักงานสอบสวน'
    ];
    
    const isCaseChanged = caseFieldsToCheck.some(field => oldRowDataMap[field] !== currentDataMap[field]);
    
    if (isCaseChanged || !caseDocId) {
      needNewCaseDoc = true;
      if (oldRowDataMap['File_ID_สำนวน']) try { DriveApp.getFileById(oldRowDataMap['File_ID_สำนวน']).setTrashed(true); } catch(e){}
    }
  }

  if (needNewCaseDoc) {
    const stationData = getStationAndOfficerData(currentDataMap['พนักงานสอบสวน'], currentDataMap['ผู้สั่งคดี'], currentDataMap['ผู้อนุญาตปล่อยตัว']);
    const allData = { ...currentDataMap, ...stationData };
    const caseFileName = `เมาขับ ${allData['เลขคดี']} ${allData['ผู้ต้องหา']}`;
    caseDocId = createDocFromTemplate(CONFIG.TEMPLATE_CASE_ID, folder, caseFileName, allData);
    caseDocUrl = DriveApp.getFileById(caseDocId).getUrl();
  }

  let bailDocId = currentDataMap['File_ID_ประกัน'];
  let bailDocUrl = currentDataMap['ประกันตัว'];
  let needNewBailDoc = false;
  let deleteOldBailDoc = false;

  if (currentDataMap['การประกันตัว'] === 'ไม่ประกันตัว') {
    if (oldRowDataMap['File_ID_ประกัน']) deleteOldBailDoc = true;
    bailDocId = "";
    bailDocUrl = "";
  } else {
    if (params.mode === 'add') {
      needNewBailDoc = true;
    } else {
      const bailFieldsToCheck = [
        'การประกันตัว', 'ผู้ประกัน', 
        'คำนำชื่อ นปก', 'ชื่อ นปก', 'สกุล นปก', 'อายุ นปก', 'โทรศัพท์ นปก', 'ที่อยู่นายประกัน',
        'หลักทรัพย์', 'มูลค่า', 'วันที่ปล่อยตัว', 'ผู้อนุญาตปล่อยตัว',
        'ชื่อ ผตห', 'สกุล ผตห', 'เลขคดี', 'อายุ ผตห', 'ที่อยู่ผู้ต้องหา', 'วันที่รับคดี', 'เวลารับคดี', 'ปจว ข้อ', 'วันที่เกิดเหตุ', 'เวลาเกิดเหตุ', 'สถานที่เกิดเหตุ', 'วันที่ส่งฟ้อง'
      ];
      
      const isBailChanged = bailFieldsToCheck.some(field => oldRowDataMap[field] !== currentDataMap[field]);
      
      if (isBailChanged || !bailDocId) {
        needNewBailDoc = true;
        if (oldRowDataMap['File_ID_ประกัน']) deleteOldBailDoc = true;
      }
    }
  }

  if (deleteOldBailDoc) {
    try { DriveApp.getFileById(oldRowDataMap['File_ID_ประกัน']).setTrashed(true); } catch(e){}
  }

  if (needNewBailDoc) {
    const stationData = getStationAndOfficerData(currentDataMap['พนักงานสอบสวน'], currentDataMap['ผู้สั่งคดี'], currentDataMap['ผู้อนุญาตปล่อยตัว']);
    const allData = { ...currentDataMap, ...stationData };
    const bailFileName = `ประกันเมาขับ ${allData['เลขคดี']} ${allData['ผู้ต้องหา']}`;
    bailDocId = createDocFromTemplate(CONFIG.TEMPLATE_BAIL_ID, folder, bailFileName, allData);
    bailDocUrl = DriveApp.getFileById(bailDocId).getUrl();
  }

  if (needNewCaseDoc) {
    if (colIndexFileCase !== -1) sheet.getRange(targetRow, colIndexFileCase + 1).setValue(caseDocId);
    if (colIndexLinkCase !== -1) sheet.getRange(targetRow, colIndexLinkCase + 1).setValue(caseDocUrl);
  }
  
  if (needNewBailDoc || deleteOldBailDoc) {
    if (colIndexFileBail !== -1) sheet.getRange(targetRow, colIndexFileBail + 1).setValue(bailDocId);
    if (colIndexLinkBail !== -1) sheet.getRange(targetRow, colIndexLinkBail + 1).setValue(bailDocUrl);
  }
  
  return responseJSON({ status: 'success' });
}

function deleteCase(params) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_DRUNK_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_DETAIL);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowIndex = params.rowIndex;
  
  if (rowIndex <= 2) return responseJSON({ status: 'error', message: 'Cannot delete header' });

  const colIndexFileCase = headers.indexOf('File_ID_สำนวน');
  const colIndexFileBail = headers.indexOf('File_ID_ประกัน');
  
  const fileIdCase = sheet.getRange(rowIndex, colIndexFileCase + 1).getValue();
  const fileIdBail = sheet.getRange(rowIndex, colIndexFileBail + 1).getValue();
  
  if (fileIdCase) try { DriveApp.getFileById(fileIdCase).setTrashed(true); } catch(e){}
  if (fileIdBail) try { DriveApp.getFileById(fileIdBail).setTrashed(true); } catch(e){}
  
  sheet.deleteRow(rowIndex);
  return responseJSON({ status: 'success' });
}

function createDocFromTemplate(templateId, folder, fileName, dataMap) {
  const templateFile = DriveApp.getFileById(templateId);
  const newFile = templateFile.makeCopy(fileName, folder);
  const doc = DocumentApp.openById(newFile.getId());
  const body = doc.getBody();
  for (const [key, value] of Object.entries(dataMap)) {
    body.replaceText(`<<${key}>>`, String(value));
  }
  doc.saveAndClose();
  return newFile.getId();
}

function getStationAndOfficerData(officerName, commanderRole, bailCommanderRole) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_STATION_ID);
  const sheetStation = ss.getSheetByName(CONFIG.SHEET_NAME_STATION);
  const sheetOfficer = ss.getSheetByName(CONFIG.SHEET_NAME_OFFICER);
  
  let result = {};
  const stData = sheetStation.getRange('B1:B9').getValues().flat();
  result['ชื่อสถานีแบบเต็ม'] = stData[0];
  result['ชื่อสถานีแบบย่อ'] = stData[1];
  result['ตำแหน่งหัวหน้าสถานีแบบเต็ม'] = stData[2];
  result['อำเภอ'] = stData[5];
  result['จังหวัด'] = stData[6];
  result['หัวหนังสือราชการ'] = stData[8];
  
  const offData = sheetOfficer.getDataRange().getValues();
  const officerRow = offData.find(r => r[4] === officerName);
  if (officerRow) {
    result['ตำแหน่งเต็ม'] = officerRow[7];
    result['ยศ'] = officerRow[0];
    result['ยศเต็ม'] = officerRow[1];
    result['ชื่อ'] = officerRow[2];
    result['สกุล'] = officerRow[3];
    result['โทรศัพท์'] = officerRow[10];
    result['ตำแหน่งย่อ'] = officerRow[6];
  }
  
  const commanderRow = offData.find(r => r[9] === commanderRole);
  if (commanderRow) {
    result['ยศ สั่งคดี'] = commanderRow[0];
    result['ยศเต็ม สั่งคดี'] = commanderRow[1];
    result['ชื่อ สั่งคดี'] = commanderRow[2];
    result['สกุล สั่งคดี'] = commanderRow[3];
    result['ตำแหน่งเต็ม สั่งคดี'] = commanderRow[7];
  }
  if (commanderRole === 'หัวหน้างานสอบสวน') result['สั่งคดีแทน'] = `ปฏิบัติราชการแทน ${stData[2]}`;
  else result['สั่งคดีแทน'] = '';
  
  const bailCommanderRow = offData.find(r => r[9] === bailCommanderRole);
  if (bailCommanderRow) {
    result['ยศ อนุญาต'] = bailCommanderRow[0];
    result['ชื่อ อนุญาต'] = bailCommanderRow[2];
    result['สกุล อนุญาต'] = bailCommanderRow[3];
    result['ตำแหน่งย่อ อนุญาต'] = bailCommanderRow[6];
  }
  if (bailCommanderRole === 'หัวหน้างานสอบสวน') result['อนุญาตแทน'] = `ปรท. ${stData[3]}`;
  else result['อนุญาตแทน'] = '';
  
  return result;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}