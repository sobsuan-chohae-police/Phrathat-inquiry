function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname;

    // ถ้าอยู่หน้า login แล้วล็อกอินแล้ว ให้ข้ามไปหน้า staff
    if (currentPage.includes('login.html')) {
        // ✨ ใช้ replace แทน href เพื่อไม่ให้พอกพูนประวัติการเข้าชม (History)
        if (isLoggedIn) window.location.replace('staff.html');
        return;
    }

    // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า login
    if (!isLoggedIn) {
        // ✨ ใช้ replace ป้องกันผู้ใช้กดปุ่มย้อนกลับ (Back) กลับมาหน้าเดิม
        window.location.replace('login.html');
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
            window.location.replace('index.html'); // ใช้ replace เตะกลับหน้าหลักสภ.
        }
    });
}

// รันเช็คทันทีที่โหลดไฟล์นี้
checkAuth();
