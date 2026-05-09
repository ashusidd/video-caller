// public/firebase-messaging-sw.js

// 🔥 Naya version taaki purana ziddi cache turant delete ho jaye
const SW_VERSION = 'vcall-hd-update-v5-no-buttons';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const isAudio = payload.data.type === 'audio';

    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    const notificationTitle = isMissed
        ? `⚠️ Missed call from ${callerName}`
        : `📞 ${callerName} is calling... (${isAudio ? 'Audio' : 'Video'})`;

    const notificationOptions = {
        body: isMissed
            ? `Tap to open chat with ${callerName}`
            : `Tap to answer ${isAudio ? 'audio' : 'video'} call...`,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: !isMissed,
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],

        // ❌ SARE BUTTONS HATA DIYE GAYE HAIN!
        actions: [],

        data: {
            // Agar missed call hai toh chat route, warna sirf basic incoming alert
            url: isMissed ? `/chat/${callerId}` : `/?incomingCall=true&callerId=${callerId}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes('v-call-hd.vercel.app') && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});