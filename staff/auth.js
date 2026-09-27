const AUTH_SCRIPT_URL = document.currentScript.src;
const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbxFrju7Ml8KoMQ6fEEr7V4Fy-u6bsvBWf8PAeBPqHpoEutHVTigMiJyjpzdbHIJ-zzL/exec';

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const currentPage = window.location.pathname;

    // ป้องกันการเตะกลับไปกลับมา (Infinite Loop)
    if (currentPage.includes('login.html')) {
        if (isLoggedIn === 'true') {
            window.location.href = 'staff.html';
        }
        return;
    }

    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = AUTH_SCRIPT_URL.replace('auth.js', 'login.html');
        return;
    }

    // 1. โหลดหน้าเว็บทันที (Instant Load)
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

        // แสดงชื่อผู้ใช้งานใน Sidebar
        if (sidebarUserName && userName) {
            sidebarUserName.innerText = userName;
        }
    });

    // 2. แอบเช็คสิทธิ์หลังบ้าน (Silent Check)
    if (userEmail) {
        fetch(AUTH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'checkAuthStatus', email: userEmail })
        })
        .then(res => res.json())
        .then(result => {
            if (result.status === 'error') {
                // กรณีโดนลบชื่อออก -> ล้างข้อมูลและเตะออกทันที
                localStorage.removeItem('userEmail');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userName');
                
                Swal.fire({
                    icon: 'error',
                    title: 'สิทธิ์การเข้าถึงถูกเพิกถอน',
                    text: 'บัญชีของคุณไม่มีสิทธิ์เข้าใช้งานระบบแล้ว',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    window.location.href = AUTH_SCRIPT_URL.replace('staff/auth.js', 'index.html');
                });
            } else if (result.status === 'success') {
                // กรณีโดนเปลี่ยนสิทธิ์ (เช่น จาก Admin เป็น User) -> อัปเดต UI ทันทีโดยไม่ต้องรีเฟรช
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
        .catch(err => console.error('Silent check failed:', err));
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
            
            window.location.href = AUTH_SCRIPT_URL.replace('staff/auth.js', 'index.html'); 
        }
    });
}

checkAuth();
