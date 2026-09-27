// ✨ จับ URL ของไฟล์ auth.js ไว้ตั้งแต่ตอนโหลดไฟล์ เพื่อให้ฟังก์ชันอื่นเรียกใช้ได้ถูกต้องเสมอ
const AUTH_SCRIPT_URL = document.currentScript.src;

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname;

    // ถ้าอยู่หน้า login แล้วล็อกอินแล้ว ให้ข้ามไปหน้า staff
    if (currentPage.includes('login.html')) {
        if (isLoggedIn) window.location.replace(AUTH_SCRIPT_URL.replace('auth.js', 'staff.html'));
        return;
    }

    // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า login
    if (!isLoggedIn) {
        window.location.replace(AUTH_SCRIPT_URL.replace('auth.js', 'login.html'));
        return;
    }

    // จัดการการแสดงผลเมนูตั้งค่าใน Sidebar (เฉพาะแอดมิน)
    document.addEventListener("DOMContentLoaded", () => {
        const adminMenuStation = document.getElementById('adminMenuStation');
        const adminMenuOfficer = document.getElementById('adminMenuOfficer');
        
        if (userRole === 'admin') {
            // ถ้าเป็นแอดมิน ให้แสดงเมนู (ใช้ flex เพื่อให้ไอคอนกับข้อความเรียงกันสวยงาม)
            if (adminMenuStation) adminMenuStation.style.display = 'flex';
            if (adminMenuOfficer) adminMenuOfficer.style.display = 'flex';
        } else {
            // ถ้าไม่ใช่แอดมิน ให้ซ่อนเมนู
            if (adminMenuStation) adminMenuStation.style.display = 'none';
            if (adminMenuOfficer) adminMenuOfficer.style.display = 'none';
        }
    });
}

// ✨ อัปเกรด: รวม UI การออกจากระบบแบบมินิมอลมาไว้ที่นี่ที่เดียว (เรียกใช้ได้ทุกหน้าเว็บ)
function logout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ',
        text: 'คุณต้องการออกจากระบบใช่หรือไม่',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true // สลับปุ่มให้ถูกหลัก UX (ยกเลิกอยู่ซ้าย)
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('userEmail');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            
            // ✨ ใช้ AUTH_SCRIPT_URL ที่จับไว้ตอนแรก เตะกลับไปหน้า index.html (หน้าหลักของ สภ.)
            window.location.replace(AUTH_SCRIPT_URL.replace('staff/auth.js', 'index.html')); 
        }
    });
}

// รันเช็คทันทีที่โหลดไฟล์นี้
checkAuth();
