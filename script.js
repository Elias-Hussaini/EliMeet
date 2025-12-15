// تولید کد اتاق ۶ رقمی
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ذخیره و بازیابی نام کاربر
function saveUsername(name) {
    localStorage.setItem('username', name);
}

function getUsername() {
    return localStorage.getItem('username') || 'کاربر';
}

// کپی به کلیپ‌بورد
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('لینک کپی شد!');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('لینک کپی شد!');
    });
}

// صفحه اصلی
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    document.addEventListener('DOMContentLoaded', function() {
        const usernameInput = document.getElementById('username');
        const createRoomBtn = document.getElementById('createRoom');
        const joinRoomBtn = document.getElementById('joinRoom');
        const roomCodeInput = document.getElementById('roomCode');
        
        // بارگذاری نام ذخیره شده
        usernameInput.value = getUsername();
        
        // تغییر نام
        usernameInput.addEventListener('input', function() {
            saveUsername(this.value || 'کاربر');
        });
        
        // ایجاد اتاق جدید
        createRoomBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim() || 'کاربر';
            const roomCode = generateRoomCode();
            saveUsername(username);
            
            window.location.href = `room.html?room=${roomCode}&username=${encodeURIComponent(username)}&host=true`;
        });
        
        // ورود به اتاق
        joinRoomBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim() || 'کاربر';
            const roomCode = roomCodeInput.value.trim();
            
            if (!roomCode || roomCode.length !== 6) {
                alert('لطفاً کد اتاق ۶ رقمی وارد کنید');
                return;
            }
            
            if (!/^\d+$/.test(roomCode)) {
                alert('کد اتاق باید عددی باشد');
                return;
            }
            
            saveUsername(username);
            window.location.href = `room.html?room=${roomCode}&username=${encodeURIComponent(username)}`;
        });
        
        // ورود با Enter
        roomCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                joinRoomBtn.click();
            }
        });
    });
}