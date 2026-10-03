/**
 * AuthHandler.js
 * ระบบตรวจสอบสิทธิ์ (Google Sign-In) และ Silent Check
 */

const AuthHandler = {

  // ==========================================
  // ระบบตรวจสอบสิทธิ์ (Google Sign-In)
  // ==========================================
  verifyUser: function (params) {
    const token = params.token;
    if (!token) return responseJSON({ status: 'error', message: 'ไม่พบข้อมูลยืนยันตัวตน' });

    let userEmail = "";

    try {
      const verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + token;
      const options = { "method": "get", "muteHttpExceptions": true };
      const response = UrlFetchApp.fetch(verifyUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode !== 200) {
        return responseJSON({ status: 'error', message: 'Google API Error: ' + responseText });
      }

      const tokenInfo = JSON.parse(responseText);

      if (tokenInfo.email) {
        userEmail = tokenInfo.email.toLowerCase().trim();
      } else {
        return responseJSON({ status: 'error', message: 'ไม่สามารถดึงข้อมูลอีเมลจาก Google ได้' });
      }
    } catch (error) {
      return responseJSON({ status: 'error', message: 'Script Error: ' + error.toString() });
    }

    const user = AuthHandler.findUserRole(userEmail);
    if (user) {
      return responseJSON({ status: 'success', role: user.role, email: userEmail, name: user.name, message: user.message });
    }

    return responseJSON({ status: 'error', message: `อีเมล ${userEmail} ไม่มีสิทธิ์เข้าใช้งานระบบ` });
  },

  // ==========================================
  // ตรวจสอบสิทธิ์หลังบ้าน (Silent Check)
  // ==========================================
  checkAuthStatus: function (params) {
    const email = params.email;
    if (!email) return responseJSON({ status: 'error', message: 'ไม่พบอีเมล' });

    const checkEmail = email.toLowerCase().trim();
    const user = AuthHandler.findUserRole(checkEmail);
    if (user) {
      return responseJSON({ status: 'success', role: user.role, name: user.name });
    }

    // ไม่พบสิทธิ์ -> เตะออก
    return responseJSON({ status: 'error', message: 'ไม่พบสิทธิ์การเข้าใช้งาน' });
  },

  // ==========================================
  // ตัวช่วย: หา role/name จากอีเมล (ใช้ร่วมกันทั้ง 2 action)
  // คืนค่า { role, name, message } หรือ null ถ้าไม่มีสิทธิ์
  // ==========================================
  findUserRole: function (email) {
    if (!email) return null;

    // เช็ค Super Admin
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      return { role: 'admin', name: 'ผู้ดูแลระบบสูงสุด', message: 'Authorized as Super Admin' };
    }

    // เช็ค Common Email
    if (COMMON_EMAILS.includes(email)) {
      return { role: 'officer', name: 'เจ้าหน้าที่ทั่วไป', message: 'Authorized as Common Officer' };
    }

    // เช็คจากชีทเจ้าหน้าที่
    const sheetOff = getSheet(SHEET_NAMES.OFFICER);
    const lastRow = getLastRowInCol(sheetOff, 1);
    if (lastRow < 2) return null;

    const emails = sheetOff.getRange(2, 13, lastRow - 1, 1).getValues().map(r => String(r[0]).toLowerCase().trim()); // คอลัมน์ M
    const roles  = sheetOff.getRange(2, 14, lastRow - 1, 1).getValues().map(r => r[0]);                              // คอลัมน์ N
    const names  = sheetOff.getRange(2, 5,  lastRow - 1, 1).getValues().map(r => r[0]);                              // คอลัมน์ E

    const userIndex = emails.indexOf(email);
    if (userIndex === -1) return null;

    const userRole = (roles[userIndex] === 'ผู้ดูแลระบบ') ? 'admin' : 'officer';
    return { role: userRole, name: names[userIndex], message: 'Authorized' };
  }

};
