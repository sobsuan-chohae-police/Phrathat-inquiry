/**
 * OfficerHandler.js
 * จัดการข้อมูลเจ้าหน้าที่ (ชีท 'ข้อมูลเจ้าหน้าที่')
 *
 * โครงสร้างคอลัมน์ที่โค้ดนี้ใช้:
 *   A-D (1-4)  : ข้อมูลส่วนต้น
 *   E   (5)    : ชื่อ (ใช้แสดงผล/เทียบหัวหน้า)
 *   G-I (7-9)  : ข้อมูลเพิ่มเติม
 *   J   (10)   : ตำแหน่งพิเศษ (หัวหน้าสถานี / หัวหน้างานสอบสวน)
 *   K-L (11-12): ข้อมูลเพิ่มเติม
 *   M   (13)   : อีเมล
 *   N   (14)   : สิทธิ์ในระบบ (ผู้ดูแลระบบ / เจ้าหน้าที่ทั่วไป)
 *   O   (15)   : วันเกิด
 */

const OfficerHandler = {

  getOfficers: function () {
    const sheet = getSheet(SHEET_NAMES.OFFICER);
    const lastRow = getLastRowInCol(sheet, 1);
    if (lastRow < 2) return responseJSON({ officers: [], roles: { chiefStation: "", chiefInvest: "" } });

    // ✨ ดึงข้อมูลถึงคอลัมน์ O (15 คอลัมน์) เพื่อให้ได้ข้อมูลวันเกิด
    const data = sheet.getRange(2, 1, lastRow - 1, 15).getValues();

    let chiefStation = "";
    let chiefInvest = "";
    data.forEach(row => {
      if (row[9] == 'หัวหน้าสถานี') chiefStation = row[4];
      if (row[9] == 'หัวหน้างานสอบสวน') chiefInvest = row[4];
    });

    return responseJSON({ officers: data, roles: { chiefStation, chiefInvest } });
  },

  deleteOfficer: function (params) {
    const sheetOff = getSheet(SHEET_NAMES.OFFICER);
    sheetOff.deleteRow(params.rowIndex + 2);
    return responseJSON({ status: 'success' });
  },

  saveOfficer: function (params) {
    const sheetOff = getSheet(SHEET_NAMES.OFFICER);
    const d = params.data;
    let targetRow = (params.mode == 'add') ? getLastRowInCol(sheetOff, 1) + 1 : params.rowIndex + 2;

    sheetOff.getRange(targetRow, 1, 1, 4).setValues([[d[0], d[1], d[2], d[3]]]);

    let role = (params.mode == 'edit') ? sheetOff.getRange(targetRow, 10).getValue() : "";
    sheetOff.getRange(targetRow, 7, 1, 7).setValues([[d[4], d[5], d[6], role, d[7], d[8], d[9]]]);

    const systemRole = (d.length > 10 && d[10]) ? d[10] : 'เจ้าหน้าที่ทั่วไป';
    sheetOff.getRange(targetRow, 14).setValue(systemRole);

    // ✨ บันทึกวันเกิดลงคอลัมน์ O (15)
    const dob = (d.length > 11 && d[11]) ? d[11] : '';
    sheetOff.getRange(targetRow, 15).setValue(dob);

    return responseJSON({ status: 'success' });
  },

  saveChiefs: function (params) {
    const sheetOff = getSheet(SHEET_NAMES.OFFICER);
    const chiefStationName = params.chiefStation;
    const chiefInvestName = params.chiefInvest;
    const lastRow = getLastRowInCol(sheetOff, 1);
    if (lastRow < 2) return responseJSON({ status: 'success' });

    const range = sheetOff.getRange(2, 10, lastRow - 1, 1);
    const rangeNames = sheetOff.getRange(2, 5, lastRow - 1, 1);
    const roles = range.getValues();
    const names = rangeNames.getValues();

    for (let i = 0; i < roles.length; i++) {
      let currentName = names[i][0];
      if (roles[i][0] == 'หัวหน้าสถานี' || roles[i][0] == 'หัวหน้างานสอบสวน') roles[i][0] = "";
      if (currentName == chiefStationName) roles[i][0] = 'หัวหน้าสถานี';
      else if (currentName == chiefInvestName) roles[i][0] = 'หัวหน้างานสอบสวน';
    }
    range.setValues(roles);
    return responseJSON({ status: 'success' });
  },

  reorderOfficers: function (params) {
    const sheetOff = getSheet(SHEET_NAMES.OFFICER);
    const newOrderData = params.data;
    const lastRow = getLastRowInCol(sheetOff, 1);
    if (lastRow >= 2) {
      sheetOff.getRange(2, 1, lastRow - 1, 4).clearContent();
      // ✨ เคลียร์ข้อมูลถึงคอลัมน์ O (15)
      sheetOff.getRange(2, 7, lastRow - 1, 9).clearContent();
    }

    if (newOrderData.length > 0) {
      const group1 = newOrderData.map(row => [row[0], row[1], row[2], row[3]]);
      sheetOff.getRange(2, 1, group1.length, 4).setValues(group1);

      // ✨ เพิ่ม row[14] (วันเกิด) เข้าไปในการจัดเรียงด้วย
      const group2 = newOrderData.map(row => [row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13] || 'เจ้าหน้าที่ทั่วไป', row[14] || '']);
      sheetOff.getRange(2, 7, group2.length, 9).setValues(group2);
    }
    return responseJSON({ status: 'success' });
  }

};
