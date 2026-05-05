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
    console.log('Call Received in Background:', payload);

    const notificationTitle = "Incoming V-CALL 📞";
    const notificationOptions = {
        body: `${payload.data.fromName || 'Someone'} is calling you...`,
        icon: '/favicon.svg',
        tag: 'call-notification',
        renotify: true,
        requireInteraction: true, // Jab tak user action na le, notification nahi jayegi
        vibrate: [200, 100, 200, 100, 200, 100, 400], // Phone vibrate karega
        actions: [
            { action: 'accept', title: '✅ Accept' },
            { action: 'decline', title: '❌ Decline' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Query parameter add kar rahe hain taaki frontend ko pata chale ki accept dabaya hai
    let targetUrl = 'https://video-caller-lemon.vercel.app/';
    if (event.action === 'accept') {
        targetUrl += '?callAction=accept';
    } else if (event.action === 'decline') {
        // Decline par site kholne ki zaroorat nahi
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url.includes('video-caller-lemon.vercel.app') && 'focus' in client) {
                    // Agar tab khula hai toh use naye URL par bhej kar focus karo
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});