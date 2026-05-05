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
    const [isLoading, setIsLoading] = useState(true); // Flicker rokne ke liye

    // Call States
    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);

    const [remoteStream, setRemoteStream] = useState(null);
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
        if (!user) {
            setIsLoading(false);
            return;
        }

        // 1. Listen for User Data
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => {
            setUserData(d.data());
            setIsLoading(false); // Data milte hi loading khatam
        });

        setupNotifications(user.uid);

        // 2. Initialize PeerJS
        const initializePeer = () => {
            if (peerInstance.current) peerInstance.current.destroy();
            const peer = new Peer(user.uid, {
                debug: 2,
                config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
            });
            peerInstance.current = peer;

            peer.on('call', (call) => {
                console.log("🔔 Call aayi hai:", call.metadata);
                setCallerInfo(call.metadata);
                setIncomingCall(call);
                setCallStatus('receiving'); // Screen par Green button dikhayega

                call.on('close', () => { endCall(); });
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') setTimeout(() => initializePeer(), 3000);
            });
        };

        initializePeer();

        // 3. Listen for Friends
        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => {
            unsubUser();
            unsubFriends();
            if (peerInstance.current) peerInstance.current.destroy();
        };
    }, [user]);

    // 4. Start Call (Caller Side)
    const startCall = async (targetUser) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            if (!targetUid) return;

            setCallStatus('ringing');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setTimeout(() => { if (myVideo.current) myVideo.current.srcObject = stream; }, 500);

            const call = peerInstance.current.call(targetUid, stream, {
                metadata: {
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

            if (typeof targetUser === 'object' && targetUser.fcmToken) {
                await addDoc(collection(db, "notifications"), {
                    to: targetUser.fcmToken,
                    fromName: userData?.name || "Someone",
                    type: "incoming_call",
                    timestamp: serverTimestamp()
                });
            }
        } catch (err) { setCallStatus('idle'); }
    };

    // 5. Accept Call (Receiver Side)
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

    // 6. End Call
    const endCall = () => {
        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();

        if (myVideo.current?.srcObject) {
            myVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (remoteVideo.current?.srcObject) {
            remoteVideo.current.srcObject.getTracks().forEach(track => track.stop());
        }

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