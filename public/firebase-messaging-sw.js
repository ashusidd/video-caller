// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDkgFg6yZltbsXiSw-h7CJzxD5ekop83iY",
    authDomain: "video-caller-2d97c.firebaseapp.com",
    projectId: "video-caller-2d97c",
    storageBucket: "video-caller-2d97c.firebasestorage.app",
    messagingSenderId: "821548025065",
    appId: "1:821548025065:web:5141e3ec11acf015afdc78"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    // 🔥 Pura data backend se nikal rahe hain
    const type = payload.data.type;
    const callerId = payload.data.fromId || '';
    const callerName = payload.data.fromName || 'Someone';

    let notifTitle = "";
    let notifBody = "";
    let targetUrl = "/";
    let isSticky = false;

    // 🔥 SMART LOGIC: Missed Call, Friend Request aur Incoming Call
    if (type === 'missed') {
        notifTitle = "⚠️ Missed call";
        notifBody = `You missed a call from ${callerName}`;
        targetUrl = `/?missedCall=${callerId}`;
    } else if (type === 'friend_request') {
        notifTitle = "👤 New Friend Request";
        notifBody = `${callerName} sent you a friend request!`;
        targetUrl = "/";
    } else {
        notifTitle = "📞 Incoming call";
        notifBody = `${callerName} is calling...`;
        targetUrl = `/?incomingCall=true&callerId=${callerId}`;
        isSticky = true; // Call notification turant nahi hatega
    }

    const notificationOptions = {
        body: notifBody,
        icon: '/favicon.svg',
        tag: 'vcall-sync-tag',
        renotify: true,
        requireInteraction: isSticky,
        vibrate: isSticky ? [2000, 1000, 2000, 1000] : [200, 100, 200],
        actions: [],
        data: {
            url: targetUrl
        }
    };

    self.registration.showNotification(notifTitle, notificationOptions);
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