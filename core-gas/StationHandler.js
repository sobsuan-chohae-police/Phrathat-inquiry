/**
 * StationHandler.js
 * จัดการข้อมูลสถานีตำรวจ (ชีท 'ข้อมูลสถานีตำรวจ' ช่วง B1:B9)
 */

const StationHandler = {

  getStation: function () {
    const sheet = getSheet(SHEET_NAMES.STATION);
    const data = sheet.getRange('B1:B9').getValues().map(r => r[0]);
    return responseJSON(data);
  },

  saveStation: function (params) {
    const sheet = getSheet(SHEET_NAMES.STATION);
    const dataToWrite = params.data.map(val => [val]);
    sheet.getRange('B1:B9').setValues(dataToWrite);
    return responseJSON({ status: 'success' });
  }

};
