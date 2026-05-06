import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, messaging, rtdb } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { AuthContext } from './AuthContext';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);

    // --- Loading & Notifications ---
    const [isLoading, setIsLoading] = useState(true);
    const [requestCount, setRequestCount] = useState(0);

    // --- Call States ---
    const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'ringing', 'receiving', 'connected'
    const [incomingCall, setIncomingCall] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);

    // --- Media Refs ---
    const myVideo = useRef();
    const remoteVideo = useRef();
    const peerInstance = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    // --- Timer Refs ---
    const [callTimer, setCallTimer] = useState(0);
    const timerRef = useRef(null);

    // --- State Blockers ---
    const callStatusRef = useRef(callStatus);
    const isConnectingRef = useRef(false);

    // --- Sound Refs ---
    const ringtoneAudio = useRef(new Audio('/sounds/ringtone.mp3'));
    const dialingAudio = useRef(new Audio('/sounds/dialing.mp3'));
    const endCallAudio = useRef(new Audio('/sounds/end.mp3'));
    const prevCallStatus = useRef('idle');

    // Keep call status updated in ref for the listener
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    // ==============================================================
    // 🌟 NEW: URL PARAMETER CATCHER (For Notification Clicks)
    // ==============================================================
    useEffect(() => {
        // URL se parameters nikalo
        const urlParams = new URLSearchParams(window.location.search);
        const autoAccept = urlParams.get('autoAccept');

        // Agar URL mein autoAccept=true hai aur app 'receiving' state mein aa chuki hai
        if (autoAccept === 'true' && callStatus === 'receiving') {
            // Thoda timeout dete hain taaki components theek se render ho jayein
            setTimeout(() => {
                acceptCall();
                // URL ko saaf kar do taaki refresh hone par issue na ho
                window.history.replaceState(null, '', window.location.pathname);
            }, 500);
        }
    }, [callStatus]); // Har baar jab callStatus change hoga, ye check karega

    // ==============================================================
    // 1. DATA FETCHING & NOTIFICATION PERMISSION
    // ==============================================================
    useEffect(() => {
        // 🔥 Browser se Notification permission maango
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        if (!user) {
            setIsLoading(false);
            return;
        }

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            setUserData(snapshot.exists() ? snapshot.data() : null);
            setIsLoading(false);
        }, (error) => {
            console.error("Fetch error:", error);
            setIsLoading(false);
        });

        const qReq = query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending"));
        const unsubRequests = onSnapshot(qReq, (snap) => setRequestCount(snap.size));

        return () => { unsubUser(); unsubRequests(); };
    }, [user]);

    // ==============================================================
    // 2. SIGNALING BRIDGE & WEB NOTIFICATION TRIGGER
    // ==============================================================
    useEffect(() => {
        if (!user || isLoading) return;

        const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
        const unsubSignals = onSnapshot(q, (snapshot) => {
            const currentStatus = callStatusRef.current;

            if (!snapshot.empty) {
                if (currentStatus === 'idle') {
                    const signalData = snapshot.docs[0].data();

                    setCallerInfo({
                        uid: signalData.callerId,
                        name: signalData.callerName,
                        photo: signalData.callerPhoto,
                        callType: signalData.type
                    });
                    setCallStatus('receiving');

                    // 🔥 Native Browser Notification Trigger
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const callNotification = new Notification("V-CALL HD: Incoming Call", {
                            body: `${signalData.callerName || 'Someone'} is calling you...`,
                            icon: signalData.callerPhoto || '/vite.svg',
                            tag: 'incoming-call',
                            requireInteraction: true
                        });

                        callNotification.onclick = function () {
                            window.focus();
                            this.close();
                        };
                    } else if ('Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                }
            } else {
                if (currentStatus === 'receiving' && !isConnectingRef.current) {
                    setCallStatus('idle');
                    setCallerInfo(null);
                    setIncomingCall(null);
                }
            }
        });

        return () => unsubSignals();
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
            ringtoneAudio.current.pause();
            ringtoneAudio.current.currentTime = 0;
            dialingAudio.current.pause();
            dialingAudio.current.currentTime = 0;
        };

        if (callStatus === 'receiving') {
            stopAllSounds();
            ringtoneAudio.current.loop = true;
            playSound(ringtoneAudio.current);
        } else if (callStatus === 'ringing') {
            stopAllSounds();
            dialingAudio.current.loop = true;
            playSound(dialingAudio.current);
        } else if (callStatus === 'idle') {
            stopAllSounds();
            if (prevCallStatus.current !== 'idle') playSound(endCallAudio.current);
        }

        prevCallStatus.current = callStatus;
        return () => stopAllSounds();
    }, [callStatus]);

    // ==============================================================
    // 4. CALL TIMER LOGIC
    // ==============================================================
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => {
                setCallTimer((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            if (callStatus === 'idle') setCallTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callStatus]);

    // ==============================================================
    // 5. MUTE/UNMUTE SYNC
    // ==============================================================
    const toggleMic = () => {
        if (myVideo.current?.srcObject) {
            const audioTrack = myVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                const newState = !audioTrack.enabled;
                audioTrack.enabled = newState;
                setIsMuted(!newState);

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
                const newState = !videoTrack.enabled;
                videoTrack.enabled = newState;
                setIsCameraOff(!newState);

                if (currentCall?.peerConnection) {
                    const videoSender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) videoSender.track.enabled = newState;
                }
                if (newState) myVideo.current.play().catch(e => console.error(e));
            }
        }
    };

    // ==============================================================
    // 6. CALL LOGIC (Start, Accept, End)
    // ==============================================================
    const startCall = async (targetUser, isVideo = true) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            setCallStatus('ringing');

            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            // Set Local Video Stream
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }

            // 1. Send Signaling Data
            await addDoc(collection(db, "signals"), {
                callerId: user.uid,
                callerName: userData?.name || "User",
                callerPhoto: userData?.photo || "",
                receiverId: targetUid,
                type: isVideo ? 'video' : 'audio',
                timestamp: serverTimestamp()
            });

            // 2. Database Notification Entry
            await addDoc(collection(db, "notifications"), {
                senderId: user.uid,
                senderName: userData?.name || "User",
                receiverId: targetUid,
                type: "call",
                message: isVideo ? "Incoming Video Call..." : "Incoming Audio Call...",
                timestamp: serverTimestamp(),
                status: "unread"
            });

            // 3. Init Peer Call
            const call = peerInstance.current.call(targetUid, stream, {
                metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' }
            });

            setCurrentCall(call);
            setIsCameraOff(!isVideo);

            // 🔥 Setup Remote Video Stream for Caller
            call.on('stream', (remStream) => {
                setCallStatus('connected');
                if (remoteVideo.current) {
                    remoteVideo.current.srcObject = remStream;
                    remoteVideo.current.play().catch(e => console.log('Caller remote video error:', e));
                }
            });

            call.on('close', () => endCall());
            call.on('error', (err) => {
                console.error("Peer JS Call Error", err);
                endCall()
            })
        } catch (err) {
            console.error("Call initialization failed:", err);
            setCallStatus('idle');
        }
    };

    const acceptCall = async () => {
        try {
            isConnectingRef.current = true;
            const isVideo = callerInfo?.callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            setCallStatus('connected');

            // Set Local Video Stream for Receiver
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }

            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            snap.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));

            if (incomingCall) {
                // NORMAL ACCEPT
                incomingCall.answer(stream);

                // 🔥 Setup Remote Video Stream for Receiver
                incomingCall.on('stream', (remStream) => {
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = remStream;
                        remoteVideo.current.play().catch(e => console.log('Receiver remote video error:', e));
                    }
                });

                incomingCall.on('close', () => endCall());
                incomingCall.on('error', (err) => {
                    console.error("Peer JS Incoming Call Error", err);
                    endCall()
                })
            }

            setTimeout(() => { isConnectingRef.current = false; }, 2000);
        } catch (err) {
            console.error("Call acceptance failed:", err);
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
        } catch (error) {
            console.error("Signal cleanup failed:", error);
        }

        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();

        // Ensure local tracks are stopped
        if (myVideo.current?.srcObject) {
            myVideo.current.srcObject.getTracks().forEach(t => t.stop());
            myVideo.current.srcObject = null;
        }

        if (remoteVideo.current?.srcObject) {
            remoteVideo.current.srcObject.getTracks().forEach(t => t.stop());
            remoteVideo.current.srcObject = null;
        }

        setCallStatus('idle');
        setCurrentCall(null);
        setIncomingCall(null);
        setCallerInfo(null);
        setIsMuted(false);
        setIsCameraOff(false);
    };

    // ==============================================================
    // 7. PEER & PRESENCE INIT
    // ==============================================================
    useEffect(() => {
        if (!user) return;
        const userStatusRef = ref(rtdb, `/status/${user.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbTimestamp() });
            set(userStatusRef, { state: 'online', last_changed: rtdbTimestamp() });
        });

        const peer = new Peer(user.uid, { debug: 2, config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
        peerInstance.current = peer;

        peer.on('call', async (call) => {
            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setCallerInfo(call.metadata);
                setIncomingCall(call);
                setCallStatus('receiving');
            } else {
                // Ignore peer call if there's no signaling record
                call.close();
            }
        });

        const unsubFriends = onSnapshot(query(collection(db, "users"), where("friends", "array-contains", user.uid)), (snap) => {
            setFriends(snap.docs.map(d => d.data()));
        });

        return () => { unsubFriends(); peer.destroy(); };
    }, [user]);

    return (
        <VideoContext.Provider value={{
            userData, isLoading, friends, selectedFriend, setSelectedFriend,
            startCall, acceptCall, endCall, requestCount,
            myVideo, remoteVideo, callStatus, callerInfo,
            isMuted, isCameraOff, toggleMic, toggleCamera, callTimer
        }}>
            {children}
        </VideoContext.Provider>
    );
};