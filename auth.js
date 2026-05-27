function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname;

    // ถ้าอยู่หน้า login แล้วล็อกอินแล้ว ให้ข้ามไปหน้า staff
    if (currentPage.includes('login.html')) {
        if (isLoggedIn) window.location.href = 'staff.html';
        return;
    }

    // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า login
    if (!isLoggedIn) {
        window.location.href = 'login.html';
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

function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html'; // ออกจากระบบแล้วกลับไปหน้าแรก
}

// รันเช็คทันทีที่โหลดไฟล์นี้
checkAuth();