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

    // Naya Status Logic: 'idle', 'ringing', 'receiving', 'connected'
    const [callStatus, setCallStatus] = useState('idle');

    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    // --- 1. PROFILE SETUP (Pehle wala function) ---
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
            console.log("Profile Setup Success! ✅");
        } catch (err) {
            console.error("Profile Setup failed:", err);
        }
    };

    // --- 2. NOTIFICATIONS SETUP ---
    const setupNotifications = async (uid) => {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const token = await getToken(messaging, {
                vapidKey: 'BEMKQLdVS5fsrlkPDABsQVGpaybLqi04I_rhbbsYWej5T7yXe7X01Xlo1B1x4anpImWemkdh2n-3dyrgfqt0Fdg'
            });

            if (token) {
                await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
                console.log("FCM Token Updated ✅");
            }
        } catch (err) {
            console.error("Notification setup failed:", err);
        }
    };

    // --- 3. PEERJS & CONNECTION LOGIC ---
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

            peer.on('open', (id) => console.log('My Peer ID is: ' + id));

            // Receiver Side Logic
            peer.on('call', (call) => {
                setCallStatus('receiving'); // Screen par Incoming Call dikhayega
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
                    if (myVideo.current) myVideo.current.srcObject = stream;
                    call.answer(stream);
                    setCallStatus('connected'); // Answer karte hi screen divide
                    call.on('stream', (userRemoteStream) => {
                        setRemoteStream(userRemoteStream);
                        if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
                    });
                }).catch(err => console.error("Failed to get local stream", err));
            });

            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    setTimeout(() => initializePeer(), 3000);
                }
            });
        };

        initializePeer();

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => setUserData(d.data()));
        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => {
            unsubUser();
            unsubFriends();
            if (peerInstance.current) peerInstance.current.destroy();
        };
    }, [user]);

    // --- 4. START CALL (With Full Screen Ringing Logic) ---
    const startCall = async (targetUser) => {
        try {
            setCallStatus('ringing'); // Turant UI ko Ringing mode mein dalo
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (myVideo.current) myVideo.current.srcObject = stream;

            const call = peerInstance.current.call(targetUser.uid, stream);
            if (!call) return;

            call.on('stream', (userRemoteStream) => {
                setRemoteStream(userRemoteStream);
                setCallStatus('connected'); // Dusre ne uthaya -> Screen split!
                if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
            });

            if (targetUser.fcmToken) {
                await addDoc(collection(db, "notifications"), {
                    to: targetUser.fcmToken,
                    fromName: userData?.name || "Someone",
                    type: "incoming_call",
                    timestamp: serverTimestamp()
                });
            }
        } catch (err) {
            setCallStatus('idle');
            console.error("Start call failed:", err);
        }
    };

    const endCall = () => {
        setCallStatus('idle');
        window.location.reload();
    };

    // --- 5. SEARCH USERS (Pehle wala function) ---
    const searchUsers = async (term) => {
        const q = query(collection(db, "users"), where("username", ">=", term), where("username", "<=", term + '\uf8ff'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
    };

    return (
        <VideoContext.Provider value={{
            userData, friends, selectedFriend, setSelectedFriend,
            searchUsers, startCall, endCall, myVideo, remoteVideo,
            remoteStream, setupProfile, callStatus, setCallStatus
        }}>
            {children}
        </VideoContext.Provider>
    );
};