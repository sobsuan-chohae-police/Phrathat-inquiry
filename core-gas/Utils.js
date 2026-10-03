/**
 * Utils.js
 * ฟังก์ชันตัวช่วยที่ใช้ร่วมกันทุกไฟล์
 */

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

function getLastRowInCol(sheet, colIndex) {
  const data = sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== "" && data[i][0] != null) return i + 1;
  }
  return 0;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
