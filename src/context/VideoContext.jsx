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

    // Naye States - Call Handle Karne Ke Liye
    const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'ringing', 'receiving', 'connected'
    const [incomingCall, setIncomingCall] = useState(null); // Call hold par rakhne ke liye
    const [currentCall, setCurrentCall] = useState(null); // Active call ko track karne ke liye
    const [callerInfo, setCallerInfo] = useState(null); // Call karne wale ka naam aur photo

    const [remoteStream, setRemoteStream] = useState(null);
    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

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
        if (!user) return;
        setupNotifications(user.uid);

        const initializePeer = () => {
            if (peerInstance.current) peerInstance.current.destroy();
            const peer = new Peer(user.uid, {
                debug: 2,
                config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
            });
            peerInstance.current = peer;

            // 1. JAB DUSRE KI CALL AAYE (RECEIVING)
            peer.on('call', (call) => {
                console.log("🔔 Call aayi hai:", call.metadata);
                // Auto-answer hata diya, ab call state mein save hogi
                setCallerInfo(call.metadata);
                setIncomingCall(call);
                setCallStatus('receiving');

                // Agar dost ne uthane se pehle hi kaat di
                call.on('close', () => {
                    endCall();
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

    // 2. JAB HUM CALL LAGAYE (CALLING)
    const startCall = async (targetUser) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            if (!targetUid) return;

            console.log(`📞 Call lag rahi hai: ${targetUid} ko...`);
            setCallStatus('ringing');

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setTimeout(() => { if (myVideo.current) myVideo.current.srcObject = stream; }, 500);

            // METADATA bhej rahe hain taaki dost ko humara naam/photo dikhe
            const call = peerInstance.current.call(targetUid, stream, {
                metadata: {
                    name: userData?.name || "V-CALL User",
                    photo: userData?.photo || 'https://via.placeholder.com/150'
                }
            });

            setCurrentCall(call);

            call.on('stream', (userRemoteStream) => {
                console.log("✅ Dost ne call utha li!");
                setRemoteStream(userRemoteStream);
                setCallStatus('connected');
                setTimeout(() => { if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream; }, 500);
            });

            // Agar dost disconnect kare
            call.on('close', () => {
                endCall();
            });

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

    // 3. JAB HUM HARI (GREEN) BUTTON DABAYE (ACCEPTING)
    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCallStatus('connected');
            setCurrentCall(incomingCall);

            setTimeout(() => {
                if (myVideo.current) myVideo.current.srcObject = stream;
                incomingCall.answer(stream); // Ab jakar video share hogi

                incomingCall.on('stream', (userRemoteStream) => {
                    setRemoteStream(userRemoteStream);
                    if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
                });

                // Agar dost beech me disconnect kare
                incomingCall.on('close', () => {
                    endCall();
                });
            }, 500);
        } catch (err) { endCall(); }
    };

    // 4. JAB HUM LAAL (RED) BUTTON DABAYE (DISCONNECTING)
    const endCall = () => {
        console.log("📵 Call kaat di gayi.");

        // PeerJS connection properly close karo
        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();

        // Camera light band karo
        if (myVideo.current?.srcObject) {
            myVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (remoteVideo.current?.srcObject) {
            remoteVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }

        // States reset karo bina page refresh kiye
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
            userData, friends, selectedFriend, setSelectedFriend,
            searchUsers, startCall, acceptCall, endCall,
            myVideo, remoteVideo, callStatus, callerInfo,
            setupProfile
        }}>
            {children}
        </VideoContext.Provider>
    );
};