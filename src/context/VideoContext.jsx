import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, messaging, rtdb } from '../firebase';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { AuthContext } from './AuthContext';

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [userData, setUserData] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);

    // --- BLINK & LOADING FIX ---
    const [isLoading, setIsLoading] = useState(true);
    const [requestCount, setRequestCount] = useState(0);

    const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'ringing', 'receiving', 'connected'
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

    // 🔥 FIX 1: RACE CONDITION BLOCKER
    const isConnectingRef = useRef(false);

    // --- SOUND REFS ---
    const ringtoneAudio = useRef(new Audio('/sounds/ringtone.mp3'));
    const dialingAudio = useRef(new Audio('/sounds/dialing.mp3'));
    const endCallAudio = useRef(new Audio('/sounds/end.mp3'));
    const prevCallStatus = useRef('idle');

    // ==============================================================
    // 1. DATA FETCHING (Anti-Blink)
    // ==============================================================
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (snapshot.exists()) {
                setUserData(snapshot.data());
            } else {
                setUserData(null);
            }
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
    // 2. SIGNALING BRIDGE (Zombie UI & UI Hide/Seek Fix)
    // ==============================================================
    useEffect(() => {
        if (!user || isLoading) return;

        const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
        const unsubSignals = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // Call Aa Rahi Hai
                if (callStatus === 'idle') {
                    const signalData = snapshot.docs[0].data();
                    setCallerInfo({
                        uid: signalData.callerId,
                        name: signalData.callerName,
                        photo: signalData.callerPhoto,
                        callType: signalData.type
                    });
                    setCallStatus('receiving');
                }
            } else {
                // 🔥 FIX 2: Sirf 'receiving' wale ka UI clear hoga, wo bhi tab jab wo connect NAHI ho raha ho.
                // Isse Caller (ringing) ka UI kabhi gayab nahi hoga!
                if (callStatus === 'receiving' && !isConnectingRef.current) {
                    setCallStatus('idle');
                    setCallerInfo(null);
                    setIncomingCall(null);
                }
            }
        });

        return () => unsubSignals();
    }, [user, callStatus, isLoading]);

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
            if (prevCallStatus.current !== 'idle') {
                playSound(endCallAudio.current);
            }
        }

        prevCallStatus.current = callStatus;
        return () => stopAllSounds();
    }, [callStatus]);

    // ==============================================================
    // 4. MUTE/UNMUTE SYNC (WebRTC getSenders)
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
    // 5. CALL LOGIC
    // ==============================================================
    const startCall = async (targetUser, isVideo = true) => {
        try {
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
            setCallStatus('ringing');
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            if (myVideo.current) myVideo.current.srcObject = stream;

            await addDoc(collection(db, "signals"), {
                callerId: user.uid,
                callerName: userData?.name || "User",
                receiverId: targetUid,
                type: isVideo ? 'video' : 'audio',
                timestamp: serverTimestamp()
            });

            const call = peerInstance.current.call(targetUid, stream, {
                metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' }
            });

            setCurrentCall(call);
            setIsCameraOff(!isVideo);

            call.on('stream', (remStream) => {
                setCallStatus('connected');
                if (remoteVideo.current) remoteVideo.current.srcObject = remStream;
            });
            call.on('close', () => endCall());
        } catch (err) { setCallStatus('idle'); }
    };

    const acceptCall = async () => {
        try {
            // 🔥 Blocker ON: Signal delete hone par UI idle nahi hoga
            isConnectingRef.current = true;

            const isVideo = callerInfo?.callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            setCallStatus('connected');

            // Signal Delete karo (taaki dusre devices pe ring band ho)
            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            snap.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));

            if (myVideo.current) myVideo.current.srcObject = stream;
            if (incomingCall) {
                incomingCall.answer(stream);
                incomingCall.on('stream', (remStream) => {
                    if (remoteVideo.current) remoteVideo.current.srcObject = remStream;
                });
            }

            // Connection stable hone ke baad blocker hata do
            setTimeout(() => { isConnectingRef.current = false; }, 2000);

        } catch (err) {
            isConnectingRef.current = false;
            endCall();
        }
    };

    const endCall = async () => {
        // Blocker reset
        isConnectingRef.current = false;

        const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
        const snap = await getDocs(q);
        snap.forEach(async (d) => await deleteDoc(doc(db, "signals", d.id)));

        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();
        if (myVideo.current?.srcObject) myVideo.current.srcObject.getTracks().forEach(t => t.stop());

        setCallStatus('idle');
        setCurrentCall(null);
        setIncomingCall(null);
        setCallerInfo(null); // Zombie UI clear
        setIsMuted(false);
        setIsCameraOff(false);
    };

    // ==============================================================
    // 6. PEER & PRESENCE INIT
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
        peer.on('call', (call) => {
            setCallerInfo(call.metadata);
            setIncomingCall(call);
            setCallStatus('receiving');
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