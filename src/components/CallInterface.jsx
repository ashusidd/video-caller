import { useContext, useState, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

export default function CallInterface() {
    const {
        myVideo,
        remoteVideo,
        endCall,
        callStatus,
        callerInfo,
        acceptCall,
        selectedFriend,
        userData,
        isMuted,
        isCameraOff,
        toggleMic,
        toggleCamera,
        callTimer
    } = useContext(VideoContext);

    const [networkSpeed, setNetworkSpeed] = useState('Excellent');
    const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);

    // 🔥 Check call type: callerInfo ya selectedFriend se
    const isVideoCall = (callerInfo?.callType === 'video') || (selectedFriend?.callType === 'video');

    useEffect(() => {
        if (callStatus === 'connected') {
            const remoteUid = selectedFriend?.uid || callerInfo?.uid;
            if (!remoteUid) return;
            const statusRef = ref(rtdb, `call_status/${remoteUid}`);
            const unsub = onValue(statusRef, (snapshot) => {
                const data = snapshot.val();
                setIsRemoteCameraOff(data?.videoEnabled === false);
            });
            return () => unsub();
        }
    }, [callStatus, selectedFriend, callerInfo]);

    useEffect(() => {
        if (callStatus === 'connected') {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                const updateStatus = () => {
                    if (connection.downlink > 5) setNetworkSpeed('Excellent');
                    else if (connection.downlink > 2) setNetworkSpeed('Good');
                    else setNetworkSpeed('Poor');
                };
                connection.onchange = updateStatus;
                updateStatus();
            }
        }
    }, [callStatus]);

    if (callStatus === 'idle') return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- 1. INCOMING CALL SCREEN ---
    if (callStatus === 'receiving') {
        const isAudioCall = callerInfo?.callType === 'audio';
        return (
            <div className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <div className="relative z-10">
                    <img
                        src={callerInfo?.photo || callerInfo?.photoURL || `https://ui-avatars.com/api/?name=${callerInfo?.name || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`}
                        className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-2xl mb-6 object-cover"
                        alt="Caller"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2.5 rounded-full shadow-lg">
                        {isAudioCall ? '📞' : '📹'}
                    </div>
                </div>
                <h2 className="text-4xl font-black text-white italic mb-2 tracking-tighter z-10">{callerInfo?.name || 'Someone'}</h2>
                <p className="text-blue-500 font-mono tracking-[0.3em] uppercase text-[10px] mb-16 animate-pulse z-10">Incoming {isAudioCall ? 'Audio' : 'Video'} Call...</p>
                <div className="flex gap-14 z-10">
                    <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-4xl active:scale-90 transition-transform">
                        <span className="inline-block rotate-[135deg]">📞</span>
                    </button>
                    <button onClick={acceptCall} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-4xl animate-bounce">
                        {isAudioCall ? '📞' : '📹'}
                    </button>
                </div>
            </div>
        );
    }

    // --- 2. MAIN CALL SCREEN ---
    return (
        <div className="fixed inset-0 bg-black z-[999] flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-700">

            {/* 🔥 FIXED TIMER */}
            <div className="absolute top-6 right-6 z-[120] flex flex-col items-end gap-2">
                <span className="bg-blue-600 text-white text-[11px] font-mono font-bold px-3 py-0.5 rounded shadow-lg">
                    {formatTime(callTimer)}
                </span>
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter bg-black/40 px-2 py-0.5 rounded italic">
                    Signal: {networkSpeed}
                </span>
            </div>

            {/* 🟢 REMOTE SIDE */}
            <div className={`relative bg-zinc-900 flex items-center justify-center overflow-hidden transition-all duration-500 
                ${isVideoCall ? 'h-1/2 md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-white/10' : 'h-full w-full'}`}>

                <video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${(isRemoteCameraOff || !isVideoCall) ? 'hidden' : 'block'}`}
                />

                {/* Fallback Photo */}
                {(isRemoteCameraOff || !isVideoCall) && (
                    <div className="absolute inset-0 bg-[#0b141a] flex flex-col items-center justify-center gap-4">
                        <img
                            src={selectedFriend?.photo || callerInfo?.photo || `https://ui-avatars.com/api/?name=${selectedFriend?.name || callerInfo?.name || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`}
                            className={`${isVideoCall ? 'w-32 h-32' : 'w-48 h-48'} rounded-full border-4 border-zinc-800 object-cover shadow-2xl opacity-40 grayscale`}
                            alt="Avatar"
                        />
                        {/* 🔥 FIX: Audio call aur Camera Off ka logic yahan handle ho raha hai */}
                        <span className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">
                            {!isVideoCall ? 'Audio Call' : 'Camera is off'}
                        </span>
                    </div>
                )}

                <div className="absolute top-6 left-6 z-20">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black italic px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                        {selectedFriend?.name || callerInfo?.name}
                    </span>
                </div>
            </div>

            {/* 🔵 LOCAL SIDE */}
            {isVideoCall && (
                <div className="relative h-1/2 md:h-full md:w-1/2 bg-zinc-950 flex items-center justify-center overflow-hidden">
                    <video
                        ref={myVideo}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : 'block'}`}
                    />

                    {isCameraOff && (
                        <div className="absolute inset-0 bg-[#0b141a] flex flex-col items-center justify-center gap-4">
                            <img
                                src={userData?.photo || `https://ui-avatars.com/api/?name=${userData?.name || 'U'}`}
                                className="w-24 h-24 rounded-full border-2 border-zinc-800 opacity-20 object-cover"
                                alt="Me"
                            />
                            {/* 🔥 FIX: Tumhari screen ke liye bhi 'Camera is off' ka text yahan add kar diya gaya hai */}
                            <span className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase animate-pulse opacity-50">
                                Camera is off
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* --- CALL CONTROLS --- */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-6 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${isMuted ? 'bg-zinc-800 opacity-80' : 'bg-white/10 hover:bg-white/20'}`}>
                    {isMuted ? '🔇' : '🎙️'}
                </button>

                {isVideoCall && (
                    <button
                        onClick={toggleCamera}
                        // 🔥 FIX: Added 'relative' and 'overflow-hidden' here
                        className={`relative overflow-hidden w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${isCameraOff ? 'bg-zinc-800 opacity-80' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                        📹
                        {/* 🔥 FIX: Red line will now be clipped to the button's circle */}
                        {isCameraOff && <span className="absolute w-[110%] h-[3px] bg-red-500 -rotate-45 shadow-sm"></span>}
                    </button>
                )}

                <button onClick={endCall} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-3xl hover:bg-red-700 active:scale-90 transition-transform">
                    <span className="inline-block rotate-[135deg]">📞</span>
                </button>
            </div>
        </div>
    );
}