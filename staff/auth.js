// ✨ จับ URL ของไฟล์ auth.js ไว้ตั้งแต่ตอนโหลดไฟล์
const AUTH_SCRIPT_URL = document.currentScript ? document.currentScript.src : window.location.href;
const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbxFrju7Ml8KoMQ6fEEr7V4Fy-u6bsvBWf8PAeBPqHpoEutHVTigMiJyjpzdbHIJ-zzL/exec';

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const currentPage = window.location.pathname;

    // 1. จัดการการเปลี่ยนหน้า (ใช้โค้ดดั้งเดิมของคุณที่เสถียรที่สุด)
    if (currentPage.includes('login.html')) {
        if (isLoggedIn === 'true') {
            window.location.replace(AUTH_SCRIPT_URL.replace('auth.js', 'staff.html'));
        }
        return;
    }

    if (isLoggedIn !== 'true') {
        window.location.replace(AUTH_SCRIPT_URL.replace('auth.js', 'login.html'));
        return;
    }

    // 2. จัดการ UI ทันทีที่โหลดหน้าเว็บเสร็จ
    document.addEventListener("DOMContentLoaded", () => {
        const adminMenuStation = document.getElementById('adminMenuStation');
        const adminMenuOfficer = document.getElementById('adminMenuOfficer');
        const sidebarUserName = document.getElementById('sidebarUserName'); 
        
        if (userRole === 'admin') {
            if (adminMenuStation) adminMenuStation.style.display = 'flex';
            if (adminMenuOfficer) adminMenuOfficer.style.display = 'flex';
        } else {
            if (adminMenuStation) adminMenuStation.style.display = 'none';
            if (adminMenuOfficer) adminMenuOfficer.style.display = 'none';
        }

        if (sidebarUserName && userName) {
            sidebarUserName.innerText = userName;
        }
    });

    // 3. แอบเช็คสิทธิ์หลังบ้าน (Silent Check)
    if (userEmail) {
        fetch(AUTH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'checkAuthStatus', email: userEmail })
        })
        .then(res => res.json())
        .then(result => {
            if (result.status === 'error' && result.code !== 'UNAUTHORIZED') {
                // error ชั่วคราวจากเซิร์ฟเวอร์ (เช่น ชีทเปิดไม่ได้) -> ไม่เตะออก แค่บันทึกไว้
                console.warn('Silent check server error:', result.message);
            } else if (result.status === 'error') {
                // โดนลบสิทธิ์ -> เตะออก
                localStorage.removeItem('userEmail');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userName');
                
                Swal.fire({
                    icon: 'error',
                    title: 'สิทธิ์ถูกเพิกถอน',
                    text: 'บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานระบบแล้ว',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    window.location.replace(AUTH_SCRIPT_URL.replace('staff/auth.js', 'index.html'));
                });
            } else if (result.status === 'success') {
                // อัปเดตข้อมูลถ้ามีการเปลี่ยนแปลง
                if (result.role !== userRole || result.name !== userName) {
                    localStorage.setItem('userRole', result.role);
                    localStorage.setItem('userName', result.name);
                    
                    const adminMenuStation = document.getElementById('adminMenuStation');
                    const adminMenuOfficer = document.getElementById('adminMenuOfficer');
                    const sidebarUserName = document.getElementById('sidebarUserName');

                    if (result.role === 'admin') {
                        if (adminMenuStation) adminMenuStation.style.display = 'flex';
                        if (adminMenuOfficer) adminMenuOfficer.style.display = 'flex';
                    } else {
                        if (adminMenuStation) adminMenuStation.style.display = 'none';
                        if (adminMenuOfficer) adminMenuOfficer.style.display = 'none';
                    }
                    
                    if (sidebarUserName) {
                        sidebarUserName.innerText = result.name;
                    }
                }
            }
        })
        .catch(err => console.error('Silent check error:', err));
    }
}

function logout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ',
        text: 'คุณต้องการออกจากระบบใช่หรือไม่',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('userEmail');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            
            window.location.replace(AUTH_SCRIPT_URL.replace('staff/auth.js', 'index.html')); 
        }
    });
}

// รันเช็คทันทีที่โหลดไฟล์นี้
checkAuth();
