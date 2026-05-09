// public/firebase-messaging-sw.js

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const isAudio = payload.data.type === 'audio';

    // 🔥 NAYA FIX: Audio ya Video ke hisaab se Title set hoga
    const notificationTitle = isMissed
        ? `⚠️ Missed call from ${callerName}`
        : `📞 ${callerName} is calling... (${isAudio ? 'Audio' : 'Video'})`;

    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    const notificationOptions = {
        // 🔥 NAYA FIX: Body text bhi dynamic ho gaya hai
        body: isMissed
            ? `You missed a call from ${callerName}`
            : `${callerName} is calling you for a ${isAudio ? 'audio' : 'video'} call...`,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: !isMissed,
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],
        actions: isMissed ? [] : [
            { action: 'accept', title: '✅ Accept' },
            { action: 'decline', title: '❌ Decline' }
        ],
        data: {
            // 🔥 NAYA FIX: Agar missed call ki notification par click karega toh direct chat khulegi
            url: isMissed ? `/chat/${callerId}` : `/?incomingCall=true&callerId=${callerId}&callerName=${callerName}&type=${payload.data.type || 'video'}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    // 🔥 NAYA FIX: URL me action pass kar rahe hain (Accept/Decline)
    if (event.action === 'accept') {
        targetUrl += '&callAction=accept';
    } else if (event.action === 'decline') {
        targetUrl += '&callAction=decline';
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