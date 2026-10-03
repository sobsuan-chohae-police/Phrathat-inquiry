/**
 * Router.js (Hub)
 * จุดรับ Request เดียวของ Web App -> จ่ายงานไปยัง Handler ตาม action
 * เพิ่ม action ใหม่: เขียนฟังก์ชันใน Handler แล้วมาลงทะเบียนในตารางด้านล่าง
 */

// ==========================================
// ตารางเส้นทาง GET
// ==========================================
const GET_ROUTES = {
  getStation:  () => StationHandler.getStation(),
  getOfficers: () => OfficerHandler.getOfficers()
};

// ==========================================
// ตารางเส้นทาง POST
// ==========================================
const POST_ROUTES = {
  // ระบบตรวจสอบสิทธิ์
  verifyUser:      (params) => AuthHandler.verifyUser(params),
  checkAuthStatus: (params) => AuthHandler.checkAuthStatus(params),

  // ข้อมูลสถานี
  saveStation:     (params) => StationHandler.saveStation(params),

  // ข้อมูลเจ้าหน้าที่
  deleteOfficer:   (params) => OfficerHandler.deleteOfficer(params),
  saveOfficer:     (params) => OfficerHandler.saveOfficer(params),
  saveChiefs:      (params) => OfficerHandler.saveChiefs(params),
  reorderOfficers: (params) => OfficerHandler.reorderOfficers(params)
};

function doGet(e) {
  // ไม่ส่ง action มา = getStation (เหมือนพฤติกรรมเดิม)
  const action = (e && e.parameter && e.parameter.action) || 'getStation';
  const handler = GET_ROUTES[action];

  if (!handler) {
    return responseJSON({ status: 'error', message: `ไม่รู้จัก action: ${action}` });
  }

  try {
    return handler(e);
  } catch (error) {
    return responseJSON({ status: 'error', message: 'Script Error: ' + error.toString() });
  }
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (error) {
    return responseJSON({ status: 'error', message: 'รูปแบบข้อมูล (JSON) ไม่ถูกต้อง' });
  }

  const action = params.action;
  const handler = POST_ROUTES[action];

  if (!handler) {
    return responseJSON({ status: 'error', message: `ไม่รู้จัก action: ${action}` });
  }

  try {
    return handler(params);
  } catch (error) {
    return responseJSON({ status: 'error', message: 'Script Error: ' + error.toString() });
  }
}
