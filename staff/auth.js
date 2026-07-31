function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname;

    // ✨ พระเอกของเรา: หาที่อยู่จริงของ auth.js บนหน้าเว็บ
    // เราจะใช้ข้อมูลนี้เพื่อเปลี่ยนเส้นทางไปยังหน้าอื่นๆ 
    const scriptUrl = document.currentScript.src;

    // ถ้าอยู่หน้า login แล้วล็อกอินแล้ว ให้ข้ามไปหน้า staff
    if (currentPage.includes('login.html')) {
        // ✨ เปลี่ยนจากคำว่า auth.js เป็น staff.html เพื่อพุ่งตรงไปหน้า staff 
        if (isLoggedIn) window.location.replace(scriptUrl.replace('auth.js', 'staff.html'));
        return;
    }

    // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า login
    if (!isLoggedIn) {
        // ✨ เปลี่ยนจากคำว่า auth.js เป็น login.html เพื่อพุ่งตรงไปหน้า login
        window.location.replace(scriptUrl.replace('auth.js', 'login.html'));
        return;
    }

    // จัดการการแสดงผลปุ่มตั้งค่า (เฉพาะแอดมิน)
    document.addEventListener("DOMContentLoaded", () => {
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.style.display = (userRole === 'admin') ? 'block' : 'none';
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
            
            // ✨ นำ scriptUrl มาใช้กับปุ่มออกจากระบบด้วย เพื่อให้มันกลับไปหน้าแรกสุด (index.html) ได้อย่างแม่นยำ
            const scriptUrl = document.currentScript ? document.currentScript.src : window.location.href; 
            
            // ใช้ replace เตะกลับหน้าหลักสภ.
            window.location.replace(scriptUrl.replace('staff/auth.js', 'index.html')); 
        }
    });
}

// รันเช็คทันทีที่โหลดไฟล์นี้
checkAuth();
