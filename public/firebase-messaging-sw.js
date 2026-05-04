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

    const notificationTitle = "Incoming V-CALL";
    const notificationOptions = {
        body: `${payload.data.fromName} is calling you...`,
        icon: '/logo192.png', // Aapka app icon yahan hona chahiye
        tag: 'call-notification',
        renotify: true,
        requireInteraction: true, // Jab tak user click na kare notification na jaye
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});