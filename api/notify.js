import admin from 'firebase-admin';

// Vercel par baar-baar app initialize na ho, isliye check kar rahe hain
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.VITE_FIREBASE_CLIENT_EMAIL,
            // \n ko sahi format mein convert karne ke liye replace lagaya hai
            privateKey: process.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

// Ye function tab chalega jab frontend isko call karega
export default async function handler(req, res) {
    // Sirf POST request accept karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Frontend se Token aur Naam nikalna
    const { token, fromName } = req.body;

    // Notification ka design
    const payload = {
        notification: {
            title: "📹 V-CALL HD",
            body: `${fromName} is calling you...`,
        },
        token: token // Jisko call lag rahi hai uska token
    };

    try {
        // Firebase ke zariye push notification bhejna
        await admin.messaging().send(payload);
        res.status(200).json({ success: true, message: "Notification sent!" });
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: error.message });
    }
}