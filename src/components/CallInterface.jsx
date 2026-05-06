import { useContext, useState, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';

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

    const [isLoudspeaker, setIsLoudspeaker] = useState(true);
    const [networkSpeed, setNetworkSpeed] = useState('Excellent');

    // Call Type: Video call hai ya Audio, ye metadata se decide hota hai
    const isVideoCall = callerInfo ? callerInfo.callType === 'video' : !isCameraOff;

    // --- 🔊 LOUDSPEAKER LOGIC: Digital Volume Control ---
    useEffect(() => {
        if (remoteVideo.current) {
            // Loudspeaker logic: volume 1.0 (Full) or 0.3 (Low for earpiece feel)
            remoteVideo.current.volume = isLoudspeaker ? 1.0 : 0.3;
        }
    }, [isLoudspeaker, callStatus]);

    // Network speed monitor (B.Tech touch for professional feel)
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
                    <img src={callerInfo?.photo || 'https://via.placeholder.com/150'} className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-2xl mb-6 object-cover" />
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2.5 rounded-full shadow-lg">
                        {isAudioCall ? '📞' : '📹'}
                    </div>
                </div>
                <h2 className="text-4xl font-black text-white italic mb-2 tracking-tighter z-10">{callerInfo?.name || 'Someone'}</h2>
                <p className="text-blue-500 font-mono tracking-[0.3em] uppercase text-[10px] mb-16 animate-pulse z-10">Incoming {isAudioCall ? 'Audio' : 'Video'} Call...</p>
                <div className="flex gap-14 z-10">
                    <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-4xl active:scale-90 transition-transform shadow-lg shadow-red-900/20">❌</button>
                    <button onClick={acceptCall} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-4xl animate-bounce active:scale-90 transition-transform shadow-lg shadow-green-900/20">
                        {isAudioCall ? '📞' : '📹'}
                    </button>
                </div>
            </div>
        );
    }

    // --- 2. MAIN CALL SCREEN ---
    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-700">

            {/* Remote Video Stream */}
            <div className="relative flex-1 bg-zinc-900 border-b md:border-b-0 md:border-r border-white/5 flex items-center justify-center">
                <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />

                {/* Placeholder: Jab friend video off kare ya audio call ho */}
                {(!isVideoCall || (isVideoCall && isCameraOff)) && (
                    <div className="absolute inset-0 bg-[#0b141a] flex flex-col items-center justify-center gap-4">
                        <img src={selectedFriend?.photo || callerInfo?.photo || 'https://via.placeholder.com/150'} className="w-40 h-40 rounded-full border-4 border-zinc-800 object-cover shadow-2xl" />
                        {!isVideoCall && <span className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">Voice Call Active</span>}
                    </div>
                )}

                {/* User Info Overlay */}
                {callStatus === 'connected' && (
                    <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black italic px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest w-fit">
                            {selectedFriend?.name || callerInfo?.name}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-[11px] font-mono font-bold px-3 py-0.5 rounded shadow-lg">{formatTime(callTimer)}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter bg-black/40 px-2 py-0.5 rounded italic">Signal: {networkSpeed}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* My Local Preview (Only for Video Calls) */}
            {isVideoCall && (
                <div className="relative flex-1 bg-zinc-950 flex items-center justify-center border-t md:border-t-0 md:border-l border-white/5">
                    {isCameraOff ? (
                        <div className="w-full h-full bg-[#0b141a] flex items-center justify-center">
                            <img src={userData?.photo || 'https://via.placeholder.com/150'} className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover opacity-30 grayscale" />
                        </div>
                    ) : (
                        <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    )}
                </div>
            )}

            {/* --- CALL CONTROLS --- */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-4 md:gap-8 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">

                {/* 🎙️ Mic Button (Toggle) */}
                <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                    {isMuted ? '🔇' : '🎙️'}
                </button>

                {/* 🔊 Loudspeaker Button (Local Switch) */}
                <button
                    onClick={() => setIsLoudspeaker(!isLoudspeaker)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${!isLoudspeaker ? 'bg-zinc-700 text-zinc-400 border border-white/5' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title={isLoudspeaker ? "Switch to Earpiece" : "Switch to Loudspeaker"}
                >
                    {isLoudspeaker ? '🔊' : '🔈'}
                </button>

                {/* 📹 Camera Button (Video Call Only) */}
                {isVideoCall && (
                    <button
                        onClick={toggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isCameraOff ? '❌📹' : '📹'}
                    </button>
                )}

                {/* 📵 End Call Button */}
                <button
                    onClick={endCall}
                    className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-2xl shadow-2xl active:scale-90 transition-transform hover:bg-red-700"
                >
                    📵
                </button>
            </div>
        </div>
    );
}