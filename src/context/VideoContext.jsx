import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, messaging } from '../firebase';
import { getToken } from "firebase/messaging";
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from './AuthContext';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'ringing', 'receiving', 'connected'

    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    // Profile Setup Logic
    const setupProfile = async (name, username, phone) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                uid: user.uid,
                name: name,
                username: username.toLowerCase(),
                phone: phone || "",
                photo: user.photoURL,
                isProfileComplete: true,
                friends: userData?.friends || []
            }, { merge: true });
        } catch (err) { console.error("Profile Setup failed:", err); }
    };

    // Notification Setup
    const setupNotifications = async (uid) => {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
            const token = await getToken(messaging, {
                vapidKey: 'BEMKQLdVS5fsrlkPDABsQVGpaybLqi04I_rhbbsYWej5T7yXe7X01Xlo1B1x4anpImWemkdh2n-3dyrgfqt0Fdg'
            });
            if (token) {
                await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
            }
        } catch (err) { console.error("Notification failed:", err); }
    };

    useEffect(() => {
        if (!user) return;
        setupNotifications(user.uid);

        const initializePeer = () => {
            if (peerInstance.current) peerInstance.current.destroy();
            const peer = new Peer(user.uid, {
                debug: 2,
                config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
            });
            peerInstance.current = peer;

            peer.on('call', (call) => {
                console.log("🔔 Call aayi hai kisi ki!");
                setCallStatus('receiving');
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
                    setCallStatus('connected');
                    setTimeout(() => {
                        if (myVideo.current) myVideo.current.srcObject = stream;
                        call.answer(stream);
                        call.on('stream', (userRemoteStream) => {
                            setRemoteStream(userRemoteStream);
                            if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
                        });
                    }, 500);
                });
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') setTimeout(() => initializePeer(), 3000);
            });
        };

        initializePeer();
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => setUserData(d.data()));
        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => { unsubUser(); unsubFriends(); if (peerInstance.current) peerInstance.current.destroy(); };
    }, [user]);

    // THE FIX IS HERE IN startCall 🚀
    const startCall = async (targetUser) => {
        try {
            // Ye check karega ki targetUser object hai ya direct ID string
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;

            if (!targetUid) {
                console.error("❌ Target user ki ID nahi mil rahi!");
                return;
            }

            console.log(`📞 Call lag rahi hai: ${targetUid} ko...`);
            setCallStatus('ringing');

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setTimeout(() => { if (myVideo.current) myVideo.current.srcObject = stream; }, 500);

            // Ab hum proper targetUid pass kar rahe hain
            const call = peerInstance.current.call(targetUid, stream);

            call.on('stream', (userRemoteStream) => {
                console.log("✅ Samne wale ne call utha li!");
                setRemoteStream(userRemoteStream);
                setCallStatus('connected');
                setTimeout(() => { if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream; }, 500);
            });

            // Notification tabhi bhejo jab targetUser object ho aur fcmToken ho
            if (typeof targetUser === 'object' && targetUser.fcmToken) {
                await addDoc(collection(db, "notifications"), {
                    to: targetUser.fcmToken,
                    fromName: userData?.name || "Someone",
                    type: "incoming_call",
                    timestamp: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Call Error:", err);
            setCallStatus('idle');
        }
    };

    const searchUsers = async (term) => {
        const q = query(collection(db, "users"), where("username", ">=", term.toLowerCase()), where("username", "<=", term.toLowerCase() + '\uf8ff'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
    };

    return (
        <VideoContext.Provider value={{
            userData, friends, selectedFriend, setSelectedFriend,
            searchUsers, startCall, endCall: () => { setCallStatus('idle'); window.location.reload(); },
            myVideo, remoteVideo, callStatus, setupProfile
        }}>
            {children}
        </VideoContext.Provider>
    );
};