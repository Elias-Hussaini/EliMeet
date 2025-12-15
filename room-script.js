// اطلاعات جلسه
let myPeer = null;
let myStream = null;
let currentRoomId = null;
let myUsername = 'کاربر';
let myPeerId = null;
const peers = {}; // ذخیره اتصالات
const userVideos = new Map(); // ذخیره ویدیوها

// تنظیمات PeerJS
const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
    },
    debug: 3
};

// گرفتن پارامترهای URL
function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        room: urlParams.get('room'),
        username: decodeURIComponent(urlParams.get('username') || 'کاربر')
    };
}

// تولید کد اتاق
function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ذخیره و بازیابی اطلاعات
function saveUserInfo(roomId, username) {
    localStorage.setItem('lastRoom', roomId);
    localStorage.setItem('lastUsername', username);
}

// شروع برنامه
async function init() {
    try {
        console.log('🔧 شروع راه‌اندازی اتاق...');
        
        // گرفتن پارامترها
        const params = getUrlParams();
        currentRoomId = params.room || generateRoomId();
        myUsername = params.username;
        
        // ذخیره اطلاعات
        saveUserInfo(currentRoomId, myUsername);
        
        // نمایش اطلاعات
        document.getElementById('myUsername').textContent = myUsername;
        document.getElementById('roomId').textContent = currentRoomId;
        
        // راه‌اندازی دوربین
        await setupCamera();
        
        // راه‌اندازی PeerJS
        await setupPeerJS();
        
        // راه‌اندازی UI
        setupUI();
        
        // پنهان کردن صفحه بارگذاری
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('roomContainer').style.display = 'block';
            addChatMessage('سیستم', 'به اتاق خوش آمدید!');
        }, 1000);
        
    } catch (error) {
        console.error('❌ خطا در راه‌اندازی:', error);
        alert('خطا در راه‌اندازی: ' + error.message);
    }
}

// راه‌اندازی دوربین
async function setupCamera() {
    try {
        console.log('📹 راه‌اندازی دوربین...');
        
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
        
        myStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // نمایش ویدیوی خود
        const myVideo = document.getElementById('myVideo');
        myVideo.srcObject = myStream;
        myVideo.muted = true;
        
        console.log('✅ دوربین راه‌اندازی شد');
        
    } catch (error) {
        console.warn('⚠️ دسترسی به دوربین ممکن نیست:', error);
        
        // ساخت تصویر ثابت
        myStream = createStaticImage();
        const myVideo = document.getElementById('myVideo');
        myVideo.srcObject = myStream;
        myVideo.muted = true;
        
        addChatMessage('سیستم', 'دسترسی به دوربین ممکن نیست. از تصویر ثابت استفاده می‌شود.');
    }
}

// ایجاد تصویر ثابت
function createStaticImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // پس‌زمینه
    ctx.fillStyle = '#4a6fa5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // نوشتن نام
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(myUsername, canvas.width/2, canvas.height/2);
    
    return canvas.captureStream();
}

// راه‌اندازی PeerJS
async function setupPeerJS() {
    return new Promise((resolve, reject) => {
        console.log('🌐 اتصال به PeerJS Cloud...');
        
        // ساخت شناسه منحصربفرد
        myPeerId = `${currentRoomId}_${myUsername}_${Date.now()}`;
        
        myPeer = new Peer(myPeerId, PEER_CONFIG);
        
        myPeer.on('open', (id) => {
            console.log('✅ متصل به PeerJS Cloud. ID:', id);
            myPeerId = id;
            
            // اطلاع‌رسانی حضور در اتاق
            announcePresence();
            
            // شروع جستجوی کاربران
            startPeerDiscovery();
            
            resolve();
        });
        
        myPeer.on('call', (call) => {
            console.log('📞 تماس دریافتی از:', call.peer);
            handleIncomingCall(call);
        });
        
        myPeer.on('connection', (conn) => {
            console.log('🔗 اتصال داده دریافتی از:', conn.peer);
            handleDataConnection(conn);
        });
        
        myPeer.on('error', (err) => {
            console.error('❌ خطای PeerJS:', err);
            if (err.type === 'unavailable-id') {
                // اگر ID تکراری بود، دوباره امتحان کن
                setTimeout(setupPeerJS, 1000);
            }
        });
        
        myPeer.on('disconnected', () => {
            console.log('⚠️ اتصال PeerJS قطع شد');
            myPeer.reconnect();
        });
    });
}

// اطلاع‌رسانی حضور در اتاق
function announcePresence() {
    // ذخیره در localStorage برای کاربران دیگر در همین دستگاه
    const presence = {
        peerId: myPeerId,
        username: myUsername,
        timestamp: Date.now(),
        roomId: currentRoomId
    };
    
    localStorage.setItem(`room_${currentRoomId}_${myPeerId}`, JSON.stringify(presence));
    
    // حذف اطلاعات قدیمی بعد از 10 ثانیه
    setTimeout(() => {
        localStorage.removeItem(`room_${currentRoomId}_${myPeerId}`);
    }, 10000);
}

// جستجوی کاربران
function startPeerDiscovery() {
    console.log('🔍 شروع جستجوی کاربران...');
    
    // هر 3 ثانیه جستجو کن
    setInterval(() => {
        discoverPeers();
    }, 3000);
    
    // گوش دادن به تغییرات localStorage
    window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(`room_${currentRoomId}_`)) {
            discoverPeers();
        }
    });
}

// کشف کاربران دیگر
function discoverPeers() {
    // اول اطلاعات خود را به‌روز کن
    announcePresence();
    
    // سپس جستجو کن
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(`room_${currentRoomId}_`) && !key.includes(myPeerId)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                // بررسی زمان (کمتر از 10 ثانیه گذشته)
                if (data && (Date.now() - data.timestamp) < 10000) {
                    if (data.peerId && data.peerId !== myPeerId && !peers[data.peerId]) {
                        console.log('👤 یافتن کاربر جدید:', data.username);
                        connectToPeer(data.peerId, data.username);
                    }
                } else {
                    // حذف اطلاعات قدیمی
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.error('خطا در خواندن اطلاعات:', e);
            }
        }
    }
}

// اتصال به کاربر دیگر
function connectToPeer(peerId, username) {
    // اگر قبلاً متصل شده‌ایم
    if (peers[peerId] || peerId === myPeerId) {
        return;
    }
    
    console.log('🤝 در حال اتصال به:', username, '(', peerId, ')');
    
    // ایجاد تماس ویدیویی
    const call = myPeer.call(peerId, myStream);
    
    if (!call) {
        console.error('❌ نمی‌توان تماس ایجاد کرد');
        return;
    }
    
    // ذخیره اتصال
    peers[peerId] = {
        call: call,
        username: username
    };
    
    call.on('stream', (remoteStream) => {
        console.log('✅ دریافت ویدیو از:', username);
        addVideoStream(peerId, remoteStream, username);
        addChatMessage('سیستم', `${username} متصل شد`);
    });
    
    call.on('close', () => {
        console.log('❌ اتصال بسته شد با:', username);
        removeVideoStream(peerId);
        delete peers[peerId];
        addChatMessage('سیستم', `${username} قطع شد`);
    });
    
    call.on('error', (err) => {
        console.error('📞 خطای تماس:', err);
    });
}

// مدیریت تماس دریافتی
function handleIncomingCall(call) {
    console.log('📞 پاسخ به تماس از:', call.peer);
    
    // پاسخ با جریان خود
    call.answer(myStream);
    
    call.on('stream', (remoteStream) => {
        console.log('✅ دریافت ویدیو از تماس دریافتی');
        
        // استخراج نام از peerId
        const peerId = call.peer;
        const username = extractUsernameFromPeerId(peerId) || 'کاربر';
        
        addVideoStream(peerId, remoteStream, username);
        addChatMessage('سیستم', `${username} متصل شد`);
    });
    
    call.on('close', () => {
        console.log('❌ تماس دریافتی بسته شد');
        removeVideoStream(call.peer);
        delete peers[call.peer];
    });
    
    call.on('error', (err) => {
        console.error('📞 خطای تماس دریافتی:', err);
    });
    
    // ذخیره اتصال
    peers[call.peer] = {
        call: call,
        username: extractUsernameFromPeerId(call.peer) || 'کاربر'
    };
}

// استخراج نام از peerId
function extractUsernameFromPeerId(peerId) {
    try {
        const parts = peerId.split('_');
        if (parts.length > 1) {
            return decodeURIComponent(parts[1]);
        }
    } catch (e) {
        console.error('خطا در استخراج نام:', e);
    }
    return 'کاربر';
}

// اضافه کردن ویدیو
function addVideoStream(peerId, stream, username) {
    // جلوگیری از تکراری
    if (userVideos.has(peerId)) {
        const videoData = userVideos.get(peerId);
        if (videoData && videoData.video) {
            videoData.video.srcObject = stream;
        }
        return;
    }
    
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.id = `video-${peerId}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    
    const videoLabel = document.createElement('div');
    videoLabel.className = 'video-label';
    videoLabel.textContent = username;
    
    videoContainer.appendChild(video);
    videoContainer.appendChild(videoLabel);
    videoGrid.appendChild(videoContainer);
    
    // ذخیره برای مدیریت
    userVideos.set(peerId, {
        container: videoContainer,
        video: video,
        label: videoLabel
    });
}

// حذف ویدیو
function removeVideoStream(peerId) {
    if (userVideos.has(peerId)) {
        const videoData = userVideos.get(peerId);
        if (videoData && videoData.container) {
            videoData.container.remove();
        }
        userVideos.delete(peerId);
    }
}

// راه‌اندازی UI
function setupUI() {
    // کنترل دوربین
    document.getElementById('toggleVideoBtn').addEventListener('click', toggleVideo);
    
    // کنترل میکروفون
    document.getElementById('toggleAudioBtn').addEventListener('click', toggleAudio);
    
    // نمایش/مخفی کردن چت
    document.getElementById('toggleChatBtn').addEventListener('click', () => {
        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel) {
            chatPanel.style.display = chatPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // تمام صفحه
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    
    // کپی لینک
    document.getElementById('copyLinkBtn').addEventListener('click', copyRoomLink);
    
    // خروج
    document.getElementById('leaveBtn').addEventListener('click', leaveRoom);
    
    // ارسال پیام
    document.getElementById('sendBtn').addEventListener('click', sendChatMessage);
    
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

// کنترل دوربین
function toggleVideo() {
    if (myStream) {
        const videoTrack = myStream.getVideoTracks()[0];
        if (videoTrack) {
            const isEnabled = !videoTrack.enabled;
            videoTrack.enabled = isEnabled;
            
            const btn = document.getElementById('toggleVideoBtn');
            btn.classList.toggle('active', isEnabled);
            btn.innerHTML = isEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
            
            addChatMessage('سیستم', `دوربین ${isEnabled ? 'روشن' : 'خاموش'} شد`);
        }
    }
}

// کنترل میکروفون
function toggleAudio() {
    if (myStream) {
        const audioTrack = myStream.getAudioTracks()[0];
        if (audioTrack) {
            const isEnabled = !audioTrack.enabled;
            audioTrack.enabled = isEnabled;
            
            const btn = document.getElementById('toggleAudioBtn');
            btn.classList.toggle('active', isEnabled);
            btn.innerHTML = isEnabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
            
            addChatMessage('سیستم', `میکروفون ${isEnabled ? 'روشن' : 'خاموش'} شد`);
        }
    }
}

// تمام صفحه
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// کپی لینک اتاق
function copyRoomLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('لینک اتاق کپی شد!');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('لینک اتاق کپی شد!');
    });
}

// نمایش اعلان
function showNotification(message) {
    alert(message);
}

// ارسال پیام چت
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage(myUsername, message);
    input.value = '';
    input.focus();
}

// اضافه کردن پیام به چت
function addChatMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'سیستم' ? 'system-msg' : 'chat-msg';
    
    const time = new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${sender}</strong>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ایمن‌سازی متن
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ترک اتاق
function leaveRoom() {
    if (confirm('آیا مطمئن هستید که می‌خواهید اتاق را ترک کنید؟')) {
        // بستن تمام اتصالات
        Object.keys(peers).forEach(peerId => {
            if (peers[peerId] && peers[peerId].call) {
                peers[peerId].call.close();
            }
        });
        
        // توقف جریان
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop());
        }
        
        // تخریب peer
        if (myPeer) {
            myPeer.destroy();
        }
        
        // حذف اطلاعات localStorage
        localStorage.removeItem(`room_${currentRoomId}_${myPeerId}`);
        
        // بازگشت
        window.location.href = 'index.html';
    }
}

// مدیریت اتصال داده
function handleDataConnection(conn) {
    conn.on('data', (data) => {
        console.log('📨 داده دریافتی:', data);
    });
}

// شروع برنامه
document.addEventListener('DOMContentLoaded', init);