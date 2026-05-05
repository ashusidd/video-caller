import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function CallInterface() {
    const {
        myVideo,
        remoteVideo,
        endCall,
        callStatus,
        callerInfo,
        acceptCall,
        selectedFriend
    } = useContext(VideoContext);

    if (callStatus === 'idle') return null;

    // ==============================================================
    // 1. RECEIVER SCREEN (Incoming Call UI)
    // ==============================================================
    if (callStatus === 'receiving') {
        return (
            <div className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <div className="relative">
                    <img
                        src={callerInfo?.photo || 'https://via.placeholder.com/150'}
                        className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-2xl shadow-blue-500/20 mb-6 animate-pulse object-cover"
                        alt="Caller"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-full animate-bounce">📹</div>
                </div>
                <h2 className="text-4xl font-black text-white italic mb-2 tracking-tighter">
                    {callerInfo?.name || 'Someone'}
                </h2>
                <p className="text-zinc-500 font-mono tracking-[0.3em] uppercase text-[10px] mb-16 animate-pulse">
                    Incoming Video Call...
                </p>

                <div className="flex gap-14">
                    {/* Reject Button */}
                    <button onClick={endCall} className="group relative">
                        <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                        <div className="relative w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-4xl active:scale-90 transition-all border-4 border-white/10">
                            ❌
                        </div>
                    </button>

                    {/* Accept Button */}
                    <button onClick={acceptCall} className="group relative">
                        <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                        <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-4xl active:scale-90 transition-all border-4 border-white/10 animate-bounce">
                            📹
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // ==============================================================
    // 2. MAIN VIDEO INTERFACE (Full Screen Split View)
    // ==============================================================
    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col md:flex-row overflow-hidden">

            {/* --- REMOTE VIDEO (Dost ki video - 50% screen) --- */}
            <div className="relative flex-1 bg-zinc-900 border-b md:border-b-0 md:border-r border-white/5 overflow-hidden">
                <video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Ringing overlay jab tak connect na ho */}
                {callStatus === 'ringing' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md">
                        <img
                            src={selectedFriend?.photo || 'https://via.placeholder.com/150'}
                            className="w-24 h-24 rounded-full border-2 border-white/10 mb-4 object-cover animate-pulse"
                            alt="Friend"
                        />
                        <h3 className="text-xl text-white font-black italic tracking-tight mb-1">
                            {selectedFriend?.name || 'Friend'}
                        </h3>
                        <p className="text-blue-500 font-mono text-[10px] tracking-[0.4em] uppercase">Ringing...</p>
                    </div>
                )}

                {/* Name Tag */}
                {callStatus === 'connected' && (
                    <div className="absolute top-6 left-6 z-20">
                        <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black italic px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                            {selectedFriend?.name || callerInfo?.name}
                        </span>
                    </div>
                )}
            </div>

            {/* --- MY VIDEO (Aapki video - 50% screen) --- */}
            <div className="relative flex-1 bg-zinc-800 overflow-hidden">
                <video
                    ref={myVideo}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Name Tag */}
                <div className="absolute top-6 right-6 z-20">
                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black italic px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                        You
                    </span>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 3. FLOATING CONTROLS (End Call Button) */}
            {/* ============================================================== */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110]">
                <button
                    onClick={endCall}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity"></div>
                    <div className="relative w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-2xl active:scale-95 transition-all border-4 border-zinc-950">
                        📵
                    </div>
                </button>
            </div>
        </div>
    );
}