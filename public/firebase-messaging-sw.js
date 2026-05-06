// public/firebase-messaging-sw.js

// ... (Config aur initialization same rahega)

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const notificationTitle = isMissed ? "⚠️ Missed V-CALL" : "📞 Incoming V-CALL HD";

    // Payload se data nikalo
    const callerId = payload.data.fromId || ''; // Caller ki UID
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
            // URL mein saari details bhej rahe hain
            url: isMissed ? '/' : `/?incomingCall=true&callerId=${callerId}&callerName=${callerName}&type=${payload.data.callType || 'video'}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    // Notification data se target URL nikalo (jisne params pehle se hain)
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    // Agar user ne button pe click kiya 'accept' toh wo URL mein extra action jodd do
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