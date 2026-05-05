import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, messaging } from '../firebase';
import { getToken } from "firebase/messaging";
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { AuthContext } from './AuthContext';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);

    const [remoteStream, setRemoteStream] = useState(null);
    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    // 1. CLEANUP LOGS (Puraani history saaf karne ke liye)
    const cleanupOldLogs = async () => {
        if (!user) return;
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const q = query(collection(db, "calls"), where("timestamp", "<", twentyFourHoursAgo));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "calls", document.id)));
            await Promise.all(deletePromises);
            if (snapshot.size > 0) console.log(`🧹 DB Safai: ${snapshot.size} purane logs delete ho gaye!`);
        } catch (error) { console.error("Cleanup error:", error); }
    };

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
        if (!user) {
            setIsLoading(false);
            return;
        }

        // --- BLINKING FIX START ---
        // setIsLoading(true); // Loading ON rakhein jab tak data na mil jaye
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => {
            setUserData(d.data() || null);
            setIsLoading(false); // Sirf tab false karein jab Firestore ka response mil jaye
        }, (error) => {
            console.error("Firestore error:", error);
            setIsLoading(false);
        });
        // --- BLINKING FIX END ---

        setupNotifications(user.uid);
        cleanupOldLogs();

        const initializePeer = () => {
            if (peerInstance.current) peerInstance.current.destroy();
            const peer = new Peer(user.uid, {
                debug: 2,
                config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
            });
            peerInstance.current = peer;

            peer.on('call', (call) => {
                setCallerInfo(call.metadata);
                setIncomingCall(call);
                setCallStatus('receiving');
                call.on('close', () => { endCall(); });
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') setTimeout(() => initializePeer(), 3000);
            });
        };

        initializePeer();

        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => {
            unsubUser();
            unsubFriends();
            if (peerInstance.current) peerInstance.current.destroy();
        };
    }, [user]);

    const startCall = async (targetUser) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            if (!targetUid) return;

            setCallStatus('ringing');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setTimeout(() => { if (myVideo.current) myVideo.current.srcObject = stream; }, 500);

            const call = peerInstance.current.call(targetUid, stream, {
                metadata: {
                    uid: user.uid,
                    name: userData?.name || "V-CALL User",
                    photo: userData?.photo || ''
                }
            });

            setCurrentCall(call);

            call.on('stream', (userRemoteStream) => {
                setRemoteStream(userRemoteStream);
                setCallStatus('connected');
                setTimeout(() => { if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream; }, 500);
            });

            call.on('close', () => { endCall(); });

            let targetToken = null;
            if (typeof targetUser === 'object' && targetUser.fcmToken) {
                targetToken = targetUser.fcmToken;
            } else if (targetUid) {
                const friendData = friends.find(f => f.uid === targetUid);
                if (friendData && friendData.fcmToken) {
                    targetToken = friendData.fcmToken;
                }
            }

            if (targetToken) {
                try {
                    await fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: targetToken,
                            fromName: userData?.name || "Someone",
                            type: 'incoming' // Normal call signal
                        })
                    });
                } catch (err) { console.error("❌ Notification request fail:", err); }
            }
        } catch (err) { setCallStatus('idle'); }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCallStatus('connected');
            setCurrentCall(incomingCall);
            setTimeout(() => {
                if (myVideo.current) myVideo.current.srcObject = stream;
                incomingCall.answer(stream);
                incomingCall.on('stream', (userRemoteStream) => {
                    setRemoteStream(userRemoteStream);
                    if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
                });
                incomingCall.on('close', () => { endCall(); });
            }, 500);
        } catch (err) { endCall(); }
    };

    const endCall = async () => {
        // --- MISSED CALL SIGNAL LOGIC ---
        if (callStatus === 'ringing') {
            const targetUid = selectedFriend?.uid || callerInfo?.uid;
            const targetFriend = friends.find(f => f.uid === targetUid);
            if (targetFriend?.fcmToken) {
                try {
                    await fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: targetFriend.fcmToken,
                            fromName: userData?.name || "Someone",
                            type: 'missed' // Cancel hone par missed signal bhejdo
                        })
                    });
                } catch (err) { console.log("Missed signal failed"); }
            }
        }

        if (callStatus !== 'idle') {
            try {
                const participants = [user.uid, selectedFriend?.uid || callerInfo?.uid].filter(Boolean);
                await addDoc(collection(db, "calls"), {
                    participants: participants,
                    callerId: user.uid,
                    callerName: userData?.name || "User",
                    receiverId: selectedFriend?.uid || callerInfo?.uid || "Unknown",
                    receiverName: selectedFriend?.name || callerInfo?.name || "Friend",
                    status: callStatus === 'connected' ? "completed" : "missed",
                    type: 'video',
                    timestamp: serverTimestamp(),
                });
            } catch (err) { console.error("Log error:", err); }
        }

        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();
        if (myVideo.current?.srcObject) myVideo.current.srcObject.getTracks().forEach(track => track.stop());
        if (remoteVideo.current?.srcObject) remoteVideo.current.srcObject.getTracks().forEach(track => track.stop());

        setCallStatus('idle');
        setCurrentCall(null);
        setIncomingCall(null);
        setCallerInfo(null);
        setRemoteStream(null);
    };

    const searchUsers = async (term) => {
        const q = query(collection(db, "users"), where("username", ">=", term.toLowerCase()), where("username", "<=", term.toLowerCase() + '\uf8ff'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
    };

    return (
        <VideoContext.Provider value={{
            userData, isLoading, friends, selectedFriend, setSelectedFriend,
            searchUsers, startCall, acceptCall, endCall,
            myVideo, remoteVideo, callStatus, callerInfo,
            setupProfile
        }}>
            {children}
        </VideoContext.Provider>
    );
};