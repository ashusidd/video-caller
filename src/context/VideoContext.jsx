import { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Peer } from 'peerjs';
import { db, rtdb } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    const localStreamRef = useRef(null);

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

    const saveCallLog = async (remoteId, remoteName, type, status) => {
        if (!user) return;
        try {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            await addDoc(collection(db, "calls"), {
                callerId: user.uid,
                callerName: userData?.name || "User",
                receiverId: remoteId,
                receiverName: remoteName,
                type: type,
                status: status,
                timestamp: serverTimestamp(),
                expiresAt: expiryDate,
                users: [user.uid, remoteId]
            });
        } catch (e) {
            console.error("Log save error:", e);
        }
    };

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

    useEffect(() => {
        if (authloading) return;

        if (!user) {
            setIsLoading(false); setUserData(null); setFriends([]); setSelectedFriend(null);
            return;
        }

        if ('Notification' in window) {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') saveFCMToken();
            });
        }

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            setUserData(snapshot.exists() ? snapshot.data() : null);
            setTimeout(() => setIsLoading(false), 300);
        }, () => setIsLoading(false));

        const qReq = query(collection(db, "friendRequests"), where("receiverId", "==", user.uid), where("status", "==", "pending"));
        const unsubRequests = onSnapshot(qReq, (snap) => setRequestCount(snap.size));

        return () => { unsubUser(); unsubRequests(); };
    }, [user, authloading]);

    useEffect(() => {
        if (!user || isLoading) return;

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

        const qOutgoing = query(collection(db, "signals"), where("callerId", "==", user.uid));
        const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
            if (snapshot.empty && callStatusRef.current === 'ringing' && !isConnectingRef.current) {
                setTimeout(() => { if (callStatusRef.current === 'ringing') endCall(); }, 3000);
            }
        });

        return () => { unsubIncoming(); unsubOutgoing(); };
    }, [user, isLoading]);

    useEffect(() => {
        const playSound = (audio) => { audio.currentTime = 0; audio.play().catch(e => console.warn("Autoplay blocked:", e)); };
        const stopAllSounds = () => { ringtoneAudio.current.pause(); ringtoneAudio.current.currentTime = 0; dialingAudio.current.pause(); dialingAudio.current.currentTime = 0; };

        if (callStatus === 'receiving') { stopAllSounds(); ringtoneAudio.current.loop = true; playSound(ringtoneAudio.current); }
        else if (callStatus === 'ringing') { stopAllSounds(); dialingAudio.current.loop = true; playSound(dialingAudio.current); }
        else if (callStatus === 'idle') { stopAllSounds(); if (prevCallStatus.current !== 'idle') playSound(endCallAudio.current); }

        prevCallStatus.current = callStatus;
        return () => stopAllSounds();
    }, [callStatus]);

    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => setCallTimer((prev) => prev + 1), 1000);
        } else {
            clearInterval(timerRef.current);
            if (callStatus === 'idle') setCallTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callStatus]);

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                const newState = !audioTrack.enabled; audioTrack.enabled = newState; setIsMuted(!newState);
                if (currentCall?.peerConnection) {
                    const audioSender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'audio');
                    if (audioSender) audioSender.track.enabled = newState;
                }
            }
        }
    };

    const toggleCamera = async () => {
        if (myVideo.current?.srcObject) {
            const videoTrack = myVideo.current.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                const newState = !videoTrack.enabled; videoTrack.enabled = newState; setIsCameraOff(!newState);
                if (callStatus === 'connected' && user?.uid) await set(ref(rtdb, `call_status/${user.uid}`), { videoEnabled: newState });
                if (currentCall?.peerConnection) {
                    const videoSender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) videoSender.track.enabled = newState;
                }
            }
        }
    };

    const startCall = async (targetUser, isVideo = true) => {
        try {
            isConnectingRef.current = true;
            const targetUid = typeof targetUser === 'string' ? targetUser : targetUser?.uid;

            if (peerInstance.current && peerInstance.current.disconnected && !peerInstance.current.destroyed) {
                peerInstance.current.reconnect();
            }

            setCallStatus('ringing');
            setCallerInfo({ uid: targetUid, name: typeof targetUser === 'string' ? "User" : (targetUser?.name || "User"), callType: isVideo ? 'video' : 'audio' });

            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            localStreamRef.current = stream;

            setTimeout(() => {
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                    myVideo.current.onloadedmetadata = () => myVideo.current.play().catch(e => console.log(e));
                }
            }, 300);

            await set(ref(rtdb, `call_status/${user.uid}`), { videoEnabled: isVideo });

            await addDoc(collection(db, "signals"), {
                callerId: user.uid, callerName: userData?.name || "User", callerPhoto: userData?.photo || "",
                receiverId: targetUid, type: isVideo ? 'video' : 'audio', timestamp: serverTimestamp()
            });

            const receiverDoc = await getDoc(doc(db, "users", targetUid));
            if (receiverDoc.exists() && receiverDoc.data().fcmToken) {
                fetch('/api/notify', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: receiverDoc.data().fcmToken, fromName: userData?.name, type: isVideo ? 'video' : 'audio', fromId: user.uid })
                }).catch(e => console.error(e));
            }

            const call = peerInstance.current.call(targetUid, stream, { metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' } });
            setCurrentCall(call);
            setIsCameraOff(!isVideo);

            setTimeout(() => { isConnectingRef.current = false; }, 3000);
            setTimeout(() => { if (callStatusRef.current === 'ringing') endCall(); }, 30000);

            call.on('stream', (remStream) => {
                setCallStatus('connected');
                setTimeout(() => {
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = remStream;
                        remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                    }
                }, 300);
            });
            call.on('close', () => endCall());
        } catch (err) {
            // 🔥 Ye naya log batayega ki error hardware ki wajah se aayi thi ya nahi
            console.error("❌ START CALL ERROR (Hardware lock ho sakta hai):", err);
            isConnectingRef.current = false; setCallStatus('idle');
        }
    };

    const acceptCall = async () => {
        try {
            isConnectingRef.current = true;
            const isVideo = callerInfo?.callType === 'video';
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            localStreamRef.current = stream;

            setCallStatus('connected');
            await set(ref(rtdb, `call_status/${user.uid}`), { videoEnabled: isVideo });

            setTimeout(() => {
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                    myVideo.current.onloadedmetadata = () => myVideo.current.play().catch(e => console.log(e));
                }
            }, 300);

            const q = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snap = await getDocs(q);
            const deletePromises = [];
            snap.forEach((d) => deletePromises.push(deleteDoc(doc(db, "signals", d.id))));
            await Promise.all(deletePromises);

            if (incomingCall) {
                incomingCall.answer(stream);
                incomingCall.on('stream', (remStream) => {
                    setTimeout(() => {
                        if (remoteVideo.current) {
                            remoteVideo.current.srcObject = remStream;
                            remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                        }
                    }, 300);
                });
                incomingCall.on('close', () => endCall());
            } else {
                const call = peerInstance.current.call(callerInfo.uid, stream, { metadata: { uid: user.uid, name: userData?.name, callType: isVideo ? 'video' : 'audio' } });
                setCurrentCall(call);
                call.on('stream', (remStream) => {
                    setTimeout(() => {
                        if (remoteVideo.current) {
                            remoteVideo.current.srcObject = remStream;
                            remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play().catch(e => console.log(e));
                        }
                    }, 300);
                });
                call.on('close', () => endCall());
            }
            setTimeout(() => { isConnectingRef.current = false; }, 2000);
        } catch (err) {
            console.error("❌ ACCEPT CALL ERROR (Hardware lock ho sakta hai):", err);
            isConnectingRef.current = false; endCall();
        }
    };

    const endCall = async () => {
        isConnectingRef.current = true;

        const prevStatus = callStatusRef.current;
        callStatusRef.current = 'idle';

        if (prevStatus !== 'idle') {
            const isMissed = prevStatus === 'ringing' || prevStatus === 'receiving';
            const remoteId = selectedFriend?.uid || callerInfo?.uid;
            const remoteName = selectedFriend?.name || callerInfo?.name;
            const callType = callerInfo?.callType || 'video';

            if (remoteId) saveCallLog(remoteId, remoteName, callType, isMissed ? 'missed' : 'completed');
        }

        try {
            if (user?.uid) await set(ref(rtdb, `call_status/${user.uid}`), null);

            const cleanupPromises = [];
            const qIncoming = query(collection(db, "signals"), where("receiverId", "==", user.uid));
            const snapIncoming = await getDocs(qIncoming);
            snapIncoming.forEach((d) => cleanupPromises.push(deleteDoc(doc(db, "signals", d.id))));

            const qOutgoing = query(collection(db, "signals"), where("callerId", "==", user.uid));
            const snapOutgoing = await getDocs(qOutgoing);
            snapOutgoing.forEach((d) => cleanupPromises.push(deleteDoc(doc(db, "signals", d.id))));

            await Promise.all(cleanupPromises);
        } catch (error) { console.error("Signal cleanup failed:", error); }

        if (currentCall) currentCall.close();
        if (incomingCall) incomingCall.close();

        // 🔥 FIX: EXTREME HARDWARE CLEANUP (Tumhara Doubt Yahan Fix Hua Hai)
        const killTracks = (stream) => {
            if (stream && stream.getTracks) {
                stream.getTracks().forEach(track => {
                    track.stop(); // Hardware release karo
                });
            }
        };

        // 1. Memory wala stream kill karo
        killTracks(localStreamRef.current);
        localStreamRef.current = null;

        // 2. Apni video ke element se track dhundh ke kill karo
        if (myVideo.current && myVideo.current.srcObject) {
            killTracks(myVideo.current.srcObject);
            myVideo.current.srcObject = null;
        }

        // 3. Dusre ki video stream kill karo
        if (remoteVideo.current && remoteVideo.current.srcObject) {
            killTracks(remoteVideo.current.srcObject);
            remoteVideo.current.srcObject = null;
        }

        setCallStatus('idle');
        setCurrentCall(null); setIncomingCall(null); setCallerInfo(null);
        setIsMuted(false); setIsCameraOff(false);

        setTimeout(() => { isConnectingRef.current = false; }, 500);
    };

    useEffect(() => {
        if (!user) return;

        const userStatusRef = ref(rtdb, `/status/${user.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) return;
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbTimestamp() })
                .then(() => set(userStatusRef, { state: 'online', last_changed: rtdbTimestamp() }));
        });

        const peer = new Peer(user.uid, { debug: 2, config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
        peerInstance.current = peer;

        peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });

        peer.on('call', async (call) => {
            if (callStatusRef.current !== 'idle' && callStatusRef.current !== 'ringing') {
                call.answer(); setTimeout(() => call.close(), 500); return;
            }

            if (callStatusRef.current === 'ringing') {
                setTimeout(() => {
                    call.answer(myVideo.current?.srcObject);
                    setCurrentCall(call);
                    call.on('stream', (remStream) => {
                        setCallStatus('connected');
                        setTimeout(() => {
                            if (remoteVideo.current) {
                                remoteVideo.current.srcObject = remStream;
                                remoteVideo.current.onloadedmetadata = () => remoteVideo.current.play();
                            }
                        }, 300);
                    });
                    call.on('close', () => endCall());
                }, 300);
                return;
            }

            setCallerInfo(call.metadata);
            setIncomingCall(call);
            setCallStatus('receiving');
        });

        const unsubFriends = onSnapshot(doc(db, "users", user.uid), async (userSnap) => {
            if (userSnap.exists()) {
                const myFriendIds = userSnap.data().friends || [];
                if (myFriendIds.length > 0) {
                    try {
                        const friendsPromises = myFriendIds.map(async (id) => {
                            const friendDocRef = doc(db, "users", id);
                            const friendDoc = await getDoc(friendDocRef);
                            if (!friendDoc.exists()) return null;
                            return { uid: friendDoc.id, ...friendDoc.data() };
                        });
                        const rawFriendsData = await Promise.all(friendsPromises);
                        const cleanFriendsList = rawFriendsData.filter(friend => friend !== null);
                        setFriends(cleanFriendsList);
                    } catch (error) { console.error("Friends fetch error:", error); }
                } else setFriends([]);
            }
        });

        return () => { peer.destroy(); unsubFriends(); };
    }, [user]);

    const setupProfile = async (name, username, phone) => {
        if (!user) return;
        const googlePhoto = user.photoURL || "";
        await setDoc(doc(db, "users", user.uid), { name, username: username.toLowerCase().trim(), phone, photo: googlePhoto, photoURL: googlePhoto, uid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
    };

    const searchUsers = async (searchTerm) => {
        const term = searchTerm.toLowerCase().replace(/\s+/g, '');
        if (!term) return [];
        const snapshot = await getDocs(query(collection(db, "users"), where("username", ">=", term), where("username", "<=", term + '\uf8ff')));
        const results = [];
        snapshot.forEach((docSnap) => { if (docSnap.id !== user.uid) results.push({ uid: docSnap.id, ...docSnap.data() }); });
        return results;
    };

    const acceptFriendRequest = async (requestId, senderId) => {
        if (!user?.uid || !senderId) return;
        await updateDoc(doc(db, "users", user.uid), { friends: arrayUnion(senderId) });
        await deleteDoc(doc(db, "friendRequests", requestId));
        await updateDoc(doc(db, "users", senderId), { friends: arrayUnion(user.uid) });
    };

    const rejectFriendRequest = async (requestId) => { if (requestId) await deleteDoc(doc(db, "friendRequests", requestId)); };

    const deleteFriend = async (friendId) => {
        if (!user?.uid || !friendId) return;
        await updateDoc(doc(db, "users", user.uid), { friends: arrayRemove(friendId) });
        await updateDoc(doc(db, "users", friendId), { friends: arrayRemove(user.uid) });
        setSelectedFriend(null);
    };

    const saveFCMToken = async () => {
        try {
            const messaging = getMessaging();
            const currentToken = await getToken(messaging, { vapidKey: 'BEMKQLdVS5fsrlkPDABsQVGpaybLqi04I_rhbbsYWej5T7yXe7X01Xlo1B1x4anpImWemkdh2n-3dyrgfqt0Fdg' });
            if (currentToken) await setDoc(doc(db, "users", user.uid), { fcmToken: currentToken }, { merge: true });
        } catch (err) { }
    };

    return (
        <VideoContext.Provider value={{
            userData, isLoading, friends, selectedFriend, setSelectedFriend,
            startCall, acceptCall, endCall, requestCount,
            myVideo, remoteVideo, callStatus, callerInfo,
            isMuted, isCameraOff, toggleMic, toggleCamera, callTimer,
            setupProfile, searchUsers, saveFCMToken,
            acceptFriendRequest, rejectFriendRequest, deleteFriend
        }}>
            {children}
        </VideoContext.Provider>
    );
};