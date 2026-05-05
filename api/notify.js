import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.VITE_FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Frontend se 'type' bhi nikalna zaroori hai (incoming ya missed)
    const { token, fromName, type } = req.body;

    // --- CRITICAL CHANGE: notification hata kar 'data' use kar rahe hain ---
    // Isse Service Worker ko poora control milta hai vibration aur tag handle karne ka
    const payload = {
        data: {
            fromName: fromName || "Someone",
            type: type || "incoming", // Default 'incoming' rahega
            title: "📹 V-CALL HD",
        },
        token: token
    };

    try {
        await admin.messaging().send(payload);
        res.status(200).json({ success: true, message: `Notification (${type || 'incoming'}) sent!` });
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: error.message });
    }
}