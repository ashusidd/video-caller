// public/firebase-messaging-sw.js

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const notificationTitle = isMissed ? "⚠️ Missed V-CALL" : "📞 Incoming V-CALL HD";


    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    const notificationOptions = {
        body: isMissed ? `You missed a call from ${callerName}` : `${callerName} is calling you...`,
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
            url: isMissed ? '/' : `/?incomingCall=true&callerId=${callerId}&callerName=${callerName}&type=${payload.data.callType || 'video'}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');
    if (event.action === 'accept') {
        targetUrl += '&autoAccept=true';
    } else if (event.action === 'decline') {
        return;
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