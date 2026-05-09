// public/firebase-messaging-sw.js

messaging.onBackgroundMessage((payload) => {
    const isMissed = payload.data.type === 'missed';
    const isAudio = payload.data.type === 'audio';

    // 🔥 FIX 1: Variables upar define kiye taaki Crash na ho
    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    // Title aur Body set karna
    const notificationTitle = isMissed
        ? `⚠️ Missed call from ${callerName}`
        : `📞 ${callerName} is calling... (${isAudio ? 'Audio' : 'Video'})`;

    const notificationOptions = {
        body: isMissed
            ? `You missed a call from ${callerName}`
            : `${callerName} is calling you for a ${isAudio ? 'audio' : 'video'} call...`,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag', // Ye tag purani notification ko overwrite karega!
        renotify: true,
        requireInteraction: !isMissed,
        vibrate: isMissed ? [100] : [2000, 1000, 2000, 1000, 2000, 1000],

        // 🔥 FIX 2: Accept button hata diya, sirf Decline rakha hai
        actions: isMissed ? [] : [
            { action: 'decline', title: '❌ Decline' }
        ],
        data: {
            // 🔥 Missed hone par direct chat par bhejega
            url: isMissed ? `/chat/${callerId}` : `/?incomingCall=true&callerId=${callerId}&callerName=${callerName}&type=${payload.data.type || 'video'}`
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const baseUrl = 'https://v-call-hd.vercel.app';
    let targetUrl = baseUrl + (event.notification.data.url || '/');

    // 🔥 Agar user Decline dabaye
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