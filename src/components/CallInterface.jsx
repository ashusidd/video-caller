import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function CallInterface() {
    // Humne yahan naye functions (acceptCall) aur states (callStatus, callerInfo) import kiye hain
    const {
        myVideo,
        remoteVideo,
        endCall,
        callStatus,
        callerInfo,
        acceptCall
    } = useContext(VideoContext);

    // Agar call nahi chal rahi, toh ye screen gayab rahegi
    if (callStatus === 'idle') return null;

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col p-6 animate-in zoom-in duration-300">

            {/* ============================================================== */}
            {/* 1. INCOMING CALL SCREEN (Jab dost ki call aati hai) */}
            {/* ============================================================== */}
            {callStatus === 'receiving' && (
                <div className="absolute inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center backdrop-blur-xl">
                    <img
                        src={callerInfo?.photo || 'https://via.placeholder.com/150'}
                        className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-2xl shadow-blue-500/20 mb-6 animate-pulse object-cover"
                        alt="Caller"
                    />
                    <h2 className="text-4xl font-black text-white italic">{callerInfo?.name || 'Someone'}</h2>
                    <p className="text-zinc-400 font-mono tracking-widest mt-2 uppercase text-sm mb-12">is calling you...</p>

                    <div className="flex gap-10">
                        {/* Reject Button */}
                        <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all text-3xl">
                            ❌
                        </button>
                        {/* Accept Button (Ispe click karte hi video on hogi) */}
                        <button onClick={acceptCall} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 active:scale-90 transition-all text-3xl animate-bounce">
                            📹
                        </button>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 2. VIDEO GRID (Aapka original design Ringing/Connected ke liye) */}
            {/* ============================================================== */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">

                {/* Remote User Video (Dost ki screen) */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative flex items-center justify-center">
                    <video ref={remoteVideo} autoPlay className="w-full h-full object-cover absolute inset-0 z-0" />

                    {/* Agar call Ring ho rahi hai (Abhi dost ne uthayi nahi) toh ye dikhega */}
                    {callStatus === 'ringing' && (
                        <div className="z-10 flex flex-col items-center animate-pulse">
                            <span className="text-5xl mb-4">📞</span>
                            <p className="text-white font-mono tracking-widest uppercase bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Ringing...</p>
                        </div>
                    )}
                </div>

                {/* Your Video (Aapki apni screen) */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl">
                    <video ref={myVideo} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
            </div>

            {/* ============================================================== */}
            {/* 3. HANGUP BUTTON (Call kaatne ke liye) */}
            {/* ============================================================== */}
            <div className="h-32 flex items-center justify-center">
                <button
                    onClick={endCall}
                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-xl shadow-red-600/30 active:scale-90 transition-all"
                >
                    📵
                </button>
            </div>
        </div>
    );
}