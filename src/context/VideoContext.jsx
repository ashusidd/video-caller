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

    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    // 1. Naya Profile Setup Function (Merged)
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

    const setupNotifications = async (uid) => {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const token = await getToken(messaging, {
                vapidKey: 'BEMKQLdVS5fsrlkPDABsQVGpaybLqi04I_rhbbsYWej5T7yXe7X01Xlo1B1x4anpImWemkdh2n-3dyrgfqt0Fdg'
            });

            if (token) {
                // setDoc with merge use kiya hai taaki naye user ka error na aaye
                await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
                console.log("FCM Token Updated ✅");
            }
        } catch (err) {
            console.error("Notification setup failed:", err);
        }
    };

    useEffect(() => {
        if (!user) return;
        setupNotifications(user.uid);

        const peer = new Peer(user.uid, {
            debug: 2,
            config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
        });

        peerInstance.current = peer;
        peer.on('open', (id) => console.log('My Peer ID is: ' + id));

        peer.on('call', (call) => {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
                if (myVideo.current) myVideo.current.srcObject = stream;
                call.answer(stream);
                call.on('stream', (userRemoteStream) => {
                    setRemoteStream(userRemoteStream);
                    if (remoteVideo.current) remoteVideo.current.srcObject = userRemoteStream;
                });
            }).catch(err => console.error("Failed to get local stream", err));
        });

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => setUserData(d.data()));
        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => {
            unsubUser();
            unsubFriends();
            peer.destroy();
        };
    }, [user]);

    const startCall = async (targetUser) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (myVideo.current) myVideo.current.srcObject = stream;
            const call = peerInstance.current.call(targetUser.uid, stream);
            if (!call) return;
            call.on('stream', (userRemoteStream) => {
                setRemoteStream(userRemoteStream);
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
        } catch (err) { console.error("Start call failed:", err); }
    };

    const endCall = () => { window.location.reload(); };

    const searchUsers = async (term) => {
        const q = query(collection(db, "users"), where("username", ">=", term), where("username", "<=", term + '\uf8ff'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid);
    };

    return (
        <VideoContext.Provider value={{
            userData, friends, selectedFriend, setSelectedFriend,
            searchUsers, startCall, endCall, myVideo, remoteVideo,
            remoteStream, setupProfile
        }}>
            {children}
        </VideoContext.Provider>
    );
};