/**
 * Config.js
 * ค่าคงที่ (Constants) ทั้งหมดของระบบ
 * ⚠️ ห้ามอ้างอิงค่าจากไฟล์อื่นที่ระดับบนสุด (top-level) ของไฟล์นี้
 */

const SHEET_ID = '11qvIqj5J1X636VToSpyt4RWkh56QvU_CHpJGHTN2QFc';

// 1. เมล Super Admin
const SUPER_ADMIN_EMAILS = [
  'sobsuan.chohae.police@gmail.com'
];

// 2. เมลส่วนกลางสำหรับคอมพิวเตอร์โรงพัก
const COMMON_EMAILS = [
  'common.chohae@gmail.com'
];

// 3. ชื่อชีท
const SHEET_NAMES = {
  STATION: 'ข้อมูลสถานีตำรวจ',
  OFFICER: 'ข้อมูลเจ้าหน้าที่'
};

// 4. Google OAuth Client ID (ต้องตรงกับ data-client_id ใน staff/login.html)
const GOOGLE_CLIENT_ID = '298931412406-s91ak2nnd6hng8a225r1mkajq37m6hal.apps.googleusercontent.com';
