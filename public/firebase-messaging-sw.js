// public/firebase-messaging-sw.js

// 1. Firebase Service Worker Scripts Import
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. Tumhari Asli Firebase Config (Exact Keys)
firebase.initializeApp({
    apiKey: "AIzaSyDkgFg6yZltbsXiSw-h7CJzxD5ekop83iY",
    authDomain: "video-caller-2d97c.firebaseapp.com",
    projectId: "video-caller-2d97c",
    storageBucket: "video-caller-2d97c.firebasestorage.app",
    messagingSenderId: "821548025065",
    appId: "1:821548025065:web:5141e3ec11acf015afdc78"
});

const messaging = firebase.messaging();

// 3. Background Message Handler (Bina Accept/Decline Buttons ke)
messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    const notificationOptions = {
        body: isMissed ? `You missed a call from ${callerName}` : `${callerName} is calling...`,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: !isMissed,
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],
        actions: [], // ❌ Buttons hamesha ke liye hata diye hain
        data: {
            url: isMissed ? `/chat/${callerId}` : `/?incomingCall=true&callerId=${callerId}`
        }
    };

    self.registration.showNotification(
        isMissed ? "⚠️ Missed call" : "📞 Incoming call",
        notificationOptions
    );
});

// 4. Notification pe tap karne par dashboard kholne ka logic
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Yahan tumhari live Vercel link hai
    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                // Agar website pehle se khuli hai, toh wahi redirect kar do
                if (client.url.includes('v-call-hd.vercel.app') && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Agar website band hai, toh naya tab kholo
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});