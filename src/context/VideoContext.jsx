import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, messaging, rtdb } from '../firebase';
import { getToken } from "firebase/messaging";
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { AuthContext } from './AuthContext';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Naya State: Friend Requests Count ---
    const [requestCount, setRequestCount] = useState(0);

    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);

    const [remoteStream, setRemoteStream] = useState(null);
    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callTimer, setCallTimer] = useState(0);
    const timerRef = useRef(null);

    const ringtoneAudio = useRef(new Audio('/sounds/ringtone.mp3'));
    const dialingAudio = useRef(new Audio('/sounds/dialing.mp3'));
    const endCallAudio = useRef(new Audio('/sounds/end.mp3'));

    // --- 1. NOTIFICATION LOGIC: Friend Requests Listener ---
    useEffect(() => {
        if (!user) return;

        // "friendRequests" collection mein query lagayi
        const q = query(
            collection(db, "friendRequests"),
            where("receiverId", "==", user.uid),
            where("status", "==", "pending") // Sirf pending wali count karni hai
        );

        const unsubRequests = onSnapshot(q, (snapshot) => {
            // snapshot.size hume total matching documents de dega
            setRequestCount(snapshot.size);
        });

        return () => unsubRequests();
    }, [user]);

    // 2. Sound Logic Effect
    useEffect(() => {
        const stopAllSounds = () => {
            ringtoneAudio.current.pause();
            ringtoneAudio.current.currentTime = 0;
            dialingAudio.current.pause();
            dialingAudio.current.currentTime = 0;
        };

        if (callStatus === 'receiving') {
            stopAllSounds();
            ringtoneAudio.current.loop = true;
            ringtoneAudio.current.play().catch(e => console.log("Autoplay blocked:", e));
        }
        else if (callStatus === 'ringing') {
            stopAllSounds();
            dialingAudio.current.loop = true;
            dialingAudio.current.play().catch(e => console.log("Autoplay blocked:", e));
        }
        else if (callStatus === 'connected') {
            stopAllSounds();
        }
        else if (callStatus === 'idle') {
            stopAllSounds();
            if (currentCall || incomingCall) {
                endCallAudio.current.play().catch(e => console.log("End sound failed:", e));
            }
        }
        return () => stopAllSounds();
    }, [callStatus, currentCall, incomingCall]);

    // 3. Presence Logic (Online/Offline)
    useEffect(() => {
        if (!user) return;
        const userStatusRef = ref(rtdb, `/status/${user.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");
        const unsubPresence = onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbTimestamp() }).then(() => {
                set(userStatusRef, { state: 'online', last_changed: rtdbTimestamp() });
            });
        });
        return () => unsubPresence();
    }, [user]);

    // 4. Timer Logic
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => {
                setCallTimer(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            setCallTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callStatus]);

    const toggleMic = () => {
        if (myVideo.current?.srcObject) {
            const audioTrack = myVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (myVideo.current?.srcObject) {
            const videoTrack = myVideo.current.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    const cleanupOldLogs = async () => {
        if (!user) return;
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const q = query(collection(db, "calls"), where("timestamp", "<", twentyFourHoursAgo));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "calls", document.id)));
            await Promise.all(deletePromises);
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

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (d) => {
            setUserData(d.data() || null);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore error:", error);
            setIsLoading(false);
        });

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

    const startCall = async (targetUser, isVideo = true) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            if (!targetUid) return;

            setCallStatus('ringing');
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setTimeout(() => { if (myVideo.current) myVideo.current.srcObject = stream; }, 500);

            const call = peerInstance.current.call(targetUid, stream, {
                metadata: {
                    uid: user.uid,
                    name: userData?.name || "V-CALL User",
                    photo: userData?.photo || '',
                    callType: isVideo ? 'video' : 'audio'
                }
            });

            setCurrentCall(call);
            setIsCameraOff(!isVideo);

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
                            type: 'incoming'
                        })
                    });
                } catch (err) { console.error("❌ Notification request fail:", err); }
            }
        } catch (err) { setCallStatus('idle'); }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const isVideoCall = incomingCall.metadata.callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });

            setCallStatus('connected');
            setCurrentCall(incomingCall);
            setIsCameraOff(!isVideoCall);

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
                            type: 'missed'
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
                    type: isCameraOff ? 'audio' : 'video',
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
        setIsMuted(false);
        setIsCameraOff(false);
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
            setupProfile, isMuted, isCameraOff, toggleMic, toggleCamera, callTimer,
            requestCount // <-- Count export kar diya
        }}>
            {children}
        </VideoContext.Provider>
    );
};