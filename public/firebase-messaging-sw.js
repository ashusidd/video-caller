// public/firebase-messaging-sw.js

// 🔥 THE ZOMBIE KILLER: Ye naya code aate hi purane cache ko zabardasti maar dega
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
            ? `You missed a call from ${callerName}`
            : `${callerName} is calling you for a ${isAudio ? 'audio' : 'video'} call...`,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: !isMissed,
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],

        // 🔥 FIX: Accept button completely hta diya gaya hai. Ab zindagi me wapas nahi aayega!
        actions: isMissed ? [] : [
            { action: 'decline', title: '❌ Decline' }
        ],
        data: {
            url: isMissed ? `/chat/${callerId}` : `/?incomingCall=true&callerId=${callerId}&callerName=${callerName}&type=${payload.data.type || 'video'}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    // 🔥 Decline parameter lagana
    if (event.action === 'decline') {
        targetUrl += targetUrl.includes('?') ? '&callAction=decline' : '?callAction=decline';
    }

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