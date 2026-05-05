// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDkgFg6yZltbsXiSw-h7CJzxD5ekop83iY",
    authDomain: "video-caller-2d97c.firebaseapp.com",
    projectId: "video-caller-2d97c",
    storageBucket: "video-caller-2d97c.firebasestorage.app",
    messagingSenderId: "821548025065",
    appId: "1:821548025065:web:5141e3ec11acf015afdc78"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';

    const notificationTitle = isMissed ? "⚠️ Missed V-CALL" : "📞 Incoming V-CALL HD";
    const notificationOptions = {
        body: isMissed ? `You missed a call from ${payload.data.fromName}` : `${payload.data.fromName} is calling you...`,
        icon: '/favicon.svg',
        // Ye Tag purani notification ko replace karne ke liye hai
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: !isMissed,
        // Ringing pattern vs Single short vibrate for missed
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],
        actions: isMissed ? [] : [
            { action: 'accept', title: '✅ Accept' },
            { action: 'decline', title: '❌ Decline' }
        ],
        data: {
            url: isMissed ? '/' : '/?callAction=accept'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = event.action === 'accept'
        ? 'https://video-caller-lemon.vercel.app/?callAction=accept'
        : 'https://video-caller-lemon.vercel.app/';

    if (event.action === 'decline') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes('video-caller-lemon.vercel.app') && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});