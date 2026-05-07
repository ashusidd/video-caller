import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, rtdb } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { AuthContext } from './AuthContext';
import { getMessaging, getToken } from 'firebase/messaging';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user, loading: authloading } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [requestCount, setRequestCount] = useState(0);

    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);

    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callTimer, setCallTimer] = useState(0);
    const timerRef = useRef(null);

    const callStatusRef = useRef(callStatus);
    const isConnectingRef = useRef(false);

    const ringtoneAudio = useRef(new Audio('/sounds/ringtone.mp3'));
    const dialingAudio = useRef(new Audio('/sounds/dialing.mp3'));
    const endCallAudio = useRef(new Audio('/sounds/end.mp3'));
    const prevCallStatus = useRef('idle');

    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    // ==============================================================
    // 🌟 URL PARAMETER CATCHER (For Notification Auto-Accept)
    // ==============================================================
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const autoAccept = urlParams.get('autoAccept');

        if (autoAccept === 'true' && callStatus === 'receiving') {
            setTimeout(() => {
                acceptCall();
                window.history.replaceState(null, '', window.location.pathname);
            }, 500);
        }
    }, [callStatus]);

    // ==============================================================
    // 1. DATA FETCHING & PERMISSION
    // ==============================================================
    useEffect(() => {
        if (authloading) return;

        if (!user) {
            console.log("No user found.");
            setIsLoading(false);
            setUserData(null);
            return;
        }

        // 🔔 Permission aur Token Logic
        if ('Notification' in window) {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    saveFCMToken(); // 🔥 Token mangne aur save karne wala function
                }
            });
        }

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            setUserData(snapshot.exists() ? snapshot.data() : null);
            setIsLoading(false);
        }, (error) => {
            console.error("Fetch error:", error);
            setIsLoading(false);
        });

        const qReq = query(collection(db, "friendRequests"),
            where("receiverId", "==", user.uid),
            where("status", "==", "pending")
        );
        const unsubRequests = onSnapshot(qReq, (snap) => setRequestCount(snap.size));

        return () => { unsubUser(); unsubRequests(); };
    }, [user, authloading]);

    // ==============================================================
    // 2. SIGNALING BRIDGE (Incoming & Outgoing Sync)
    // ==============================================================
    useEffect(() => {
        if (!user || isLoading) return;

        // --- INCOMING LISTENER ---
        const qIncoming = query(collection(db, "signals"), where("receiverId", "==", user.uid));
        const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
            const currentStatus = callStatusRef.current;
            if (!snapshot.empty) {
                if (currentStatus === 'idle') {
                    const signalData = snapshot.docs[0].data();
                    setCallerInfo({
                        uid: signalData.callerId, name: signalData.callerName, photo: signalData.callerPhoto, callType: signalData.type
                    });
                    setCallStatus('receiving');
                }
            } else {
                if (currentStatus === 'receiving' && !isConnectingRef.current) {
                    setCallStatus('idle'); setCallerInfo(null); setIncomingCall(null);
                }
            }
        });

        // --- 🔥 OUTGOING LISTENER (For Rejected / Dropped Calls) ---
        const qOutgoing = query(collection(db, "signals"), where("callerId", "==", user.uid));
        const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
            if (snapshot.empty && callStatusRef.current === 'ringing' && !isConnectingRef.current) {
                setTimeout(() => {
                    if (callStatusRef.current === 'ringing') {
                        endCall();
                    }
                }, 3000);
            }
        });

        return () => { unsubIncoming(); unsubOutgoing(); };
    }, [user, isLoading]);

    // ==============================================================
    // 3. SOUND MANAGEMENT
    // ==============================================================
    useEffect(() => {
        const playSound = (audio) => {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn("Autoplay blocked:", e));
        };
        const stopAllSounds = () => {
            ringtoneAudio.current.pause(); ringtoneAudio.current.currentTime = 0;
            dialingAudio.current.pause(); dialingAudio.current.currentTime = 0;
        };

        if (callStatus === 'receiving') {
            stopAllSounds(); ringtoneAudio.current.loop = true; playSound(ringtoneAudio.current);
        } else if (callStatus === 'ringing') {
            stopAllSounds(); dialingAudio.current.loop = true; playSound(dialingAudio.current);
        } else if (callStatus === 'idle') {
            stopAllSounds(); if (prevCallStatus.current !== 'idle') playSound(endCallAudio.current);
        }
        prevCallStatus.current = callStatus;
        return () => stopAllSounds();
    }, [callStatus]);

    // ==============================================================
    // 4. TIMER & MUTE SYNC
    // ==============================================================
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => { setCallTimer((prev) => prev + 1); }, 1000);
        } else {
            clearInterval(timerRef.current);
            if (callStatus === 'idle') setCallTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callStatus]);

    const toggleMic = () => {
        if (myVideo.current?.srcObject) {
            const audioTrack = myVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                const newState = !audioTrack.enabled; audioTrack.enabled = newState; setIsMuted(!newState);
                if (currentCall?.peerConnection) {
                    const audioSender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'audio');
                    if (audioSender) audioSender.track.enabled = newState;
                }
            }
        }
    };

    const toggleCamera = () => {
        if (myVideo.current?.srcObject) {
            const videoTrack = myVideo.current.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                const newState = !videoTrack.enabled; videoTrack.enabled = newState; setIsCameraOff(!newState);
                if (currentCall?.peerConnection) {
                    const videoSender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) videoSender.track.enabled = newState;
                }
            }
        }
    };

    // ==============================================================
    // 5. CALL LOGIC (API Fetch, Local Video Fix & Magic Reverse Call)
    // ==============================================================
    const startCall = async (targetUser, isVideo = true) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            setCallStatus('ringing');

            setCallerInfo({
                uid: targetUid,
                name: typeof targetUser === 'string' ? "User" : (targetUser?.name || "User"),
                callType: isVideo ? 'video' : 'audio'
            });

            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            if (myVideo.current) {
                myVideo.current.srcObject = stream;
                myVideo.current.onloadedmetadata = () => myVideo.current.play().catch(e => console.log(e));
            }

            // 1. SIGNAL
            await addDoc(collection(db, "signals"), {
                callerId: user.uid, callerName: userData?.name || "User", callerPhoto: userData?.photo || "",
                receiverId: targetUid, type: isVideo ? 'video' : 'audio', timestamp: serverTimestamp()
            });

            // 2. API CALL FOR NOTIFICATION
            const receiverDoc = await getDoc(doc(db, "users", targetUid));
            if (receiverDoc.exists() && receiverDoc.data().fcmToken) {
                fetch('/api/notify', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: receiverDoc.data().fcmToken, fromName: userData?.name, type: isVideo ? 'video' : 'audio', fromId: user.uid })
                }).catch(e => console.error(e));
            }

            // 3. PEER CONNECTION
            const call = peerInstance.current.call(targetUid, stream, {
                metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' }
            });
            setCurrentCall(call);
            setIsCameraOff(!isVideo);

            call.on('stream', (remStream) => {
                setCallStatus('connected');
                if (remoteVideo.current) {
                    remoteVideo.current.srcObject = remStream;
                    remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                }
            });
            call.on('close', () => endCall());
        } catch (err) { setCallStatus('idle'); }
    };

    const acceptCall = async () => {
        try {
            isConnectingRef.current = true;
            const isVideo = callerInfo?.callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            setCallStatus('connected');

            setTimeout(() => {
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                    myVideo.current.onloadedmetadata = () => myVideo.current.play().catch(e => console.log(e));
                }
            }, 300);

            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            snap.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));

            if (incomingCall) {
                // NORMAL ACCEPT
                incomingCall.answer(stream);
                incomingCall.on('stream', (remStream) => {
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = remStream;
                        remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                    }
                });
                incomingCall.on('close', () => endCall());
            } else {
                // 🔥 THE MAGIC REVERSE CALL
                const call = peerInstance.current.call(callerInfo.uid, stream, {
                    metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' }
                });
                setCurrentCall(call);
                call.on('stream', (remStream) => {
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = remStream;
                        remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                    }
                });
                call.on('close', () => endCall());
            }

            setTimeout(() => { isConnectingRef.current = false; }, 2000);
        } catch (err) {
            isConnectingRef.current = false;
            endCall();
        }
    };

    const endCall = async () => {
        isConnectingRef.current = false;

        try {
            const qIncoming = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snapIncoming = await getDocs(qIncoming);
            snapIncoming.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));

            const qOutgoing = query(collection(db, "signals"), where("callerId", "==", user.uid));
            const snapOutgoing = await getDocs(qOutgoing);
            snapOutgoing.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));
        } catch (error) { console.error("Signal cleanup failed:", error); }

        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();

        if (myVideo.current?.srcObject) {
            myVideo.current.srcObject.getTracks().forEach(t => t.stop());
            myVideo.current.srcObject = null;
        }
        if (remoteVideo.current?.srcObject) {
            remoteVideo.current.srcObject.getTracks().forEach(t => t.stop());
            remoteVideo.current.srcObject = null;
        }

        setCallStatus('idle'); setCurrentCall(null); setIncomingCall(null); setCallerInfo(null);
        setIsMuted(false); setIsCameraOff(false);
    };

    // ==============================================================
    // 6. PEER INIT, PRESENCE & FRIENDS LISTENER
    // ==============================================================
    useEffect(() => {
        if (!user) return;

        // --- 🟢 1. PRESENCE LOGIC ---
        const userStatusRef = ref(rtdb, `/status/${user.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbTimestamp() })
                .then(() => set(userStatusRef, { state: 'online', last_changed: rtdbTimestamp() }));
        });

        // --- 🔵 2. PEERJS INITIALIZATION ---
        const peer = new Peer(user.uid, {
            debug: 2,
            config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
        });
        peerInstance.current = peer;

        peer.on('call', async (call) => {
            // Busy logic (Jo tumne pehle add kiya tha)
            if (callStatusRef.current !== 'idle' && callStatusRef.current !== 'ringing') {
                call.answer();
                setTimeout(() => call.close(), 500);
                return;
            }

            if (callStatusRef.current === 'ringing') {
                setTimeout(() => {
                    call.answer(myVideo.current?.srcObject);
                    setCurrentCall(call);
                    call.on('stream', (remStream) => {
                        setCallStatus('connected');
                        if (remoteVideo.current) {
                            remoteVideo.current.srcObject = remStream;
                            remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play();
                        }
                    });
                    call.on('close', () => endCall());
                }, 300);
                return;
            }

            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setCallerInfo(call.metadata);
                setIncomingCall(call);
                setCallStatus('receiving');
            } else {
                call.close();
            }
        });

        // --- 🤝 3. FRIENDS LISTENER (The Missing Piece) ---
        // Hum apni profile sunenge, aur jaise hi 'friends' array badlega, ye trigger hoga
        const unsubFriends = onSnapshot(doc(db, "users", user.uid), async (userSnap) => {
            if (userSnap.exists()) {
                const myFriendIds = userSnap.data().friends || [];

                if (myFriendIds.length > 0) {
                    // 'in' query se saare doston ka data ek sath uthao
                    const qFriends = query(
                        collection(db, "users"),
                        where("uid", "in", myFriendIds)
                    );

                    const friendDocs = await getDocs(qFriends);
                    const friendList = friendDocs.docs.map(d => d.data());
                    setFriends(friendList);
                } else {
                    setFriends([]); // Agar koi dost nahi hai
                }
            }
        });

        return () => {
            peer.destroy();
            unsubFriends(); // Cleanup zaroori hai memory leak rokne ke liye
        };
    }, [user]);
    // ==============================================================
    // 7. PROFILE SETUP FUNCTION
    // ==============================================================

    const setupProfile = async (name, username, phone) => {
        if (!user) return;

        try {
            // 🟢 Logic: Agar Google se photoURL mil rahi hai toh wahi use karo
            // Warna ek backup avatar initials ke saath bana lo
            const googlePhoto = user.photoURL || "";
            const backupAvatar = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`;

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                username: username.toLowerCase().trim(),
                phone: phone,
                // 🔥 Dono fields ko same rakho taaki confusion na ho
                photo: googlePhoto || backupAvatar,
                photoURL: googlePhoto || backupAvatar,
                uid: user.uid,
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log("Profile Synced!");
        } catch (error) {
            console.error("Setup error:", error);
        }
    };
    // ==============================================================
    // 8. SEARCH USERS FUNCTION
    // ==============================================================
    const searchUsers = async (searchTerm) => {
        try {
            // Space hatakar small letters mein convert karo (jaise database mein hai)
            const term = searchTerm.toLowerCase().replace(/\s+/g, '');
            if (!term) return [];

            const usersRef = collection(db, "users");
            // Ye query us username ko dhoondhegi jo type kiye hue letters se start hota hai
            const q = query(usersRef,
                where("username", ">=", term),
                where("username", "<=", term + '\uf8ff')
            );

            const snapshot = await getDocs(q);
            const results = [];

            snapshot.forEach((docSnap) => {
                // Khud ki profile ko search result mein mat dikhao
                if (docSnap.id !== user.uid) {
                    results.push({ uid: docSnap.id, ...docSnap.data() });
                }
            });

            return results;
        } catch (error) {
            console.error("Search Users Error:", error);
            return [];
        }
    };

    // ==============================================================
    // 9. SAVE FCM TOKEN (For Push Notifications)
    // ==============================================================
    const saveFCMToken = async () => {
        try {
            const messaging = getMessaging();
            const currentToken = await getToken(messaging, {
                vapidKey: 'BEMKQLdVS5fsrlkPDABsQVGpaybLqi04I_rhbbsYWej5T7yXe7X01Xlo1B1x4anpImWemkdh2n-3dyrgfqt0Fdg'
            });

            if (currentToken) {
                await setDoc(doc(db, "users", user.uid), {
                    fcmToken: currentToken
                }, { merge: true });
                console.log("FCM Token saved to DB!");
            }
        } catch (err) {
            console.error('FCM Token error:', err);
        }
    };

    return (
        <VideoContext.Provider value={{
            userData, isLoading, friends, selectedFriend, setSelectedFriend,
            startCall, acceptCall, endCall, requestCount,
            myVideo, remoteVideo, callStatus, callerInfo,
            isMuted, isCameraOff, toggleMic, toggleCamera, callTimer,
            setupProfile, searchUsers, saveFCMToken
        }}>
            {children}
        </VideoContext.Provider>
    );
};